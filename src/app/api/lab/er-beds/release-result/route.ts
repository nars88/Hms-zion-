import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mapTestToServiceType, getDefaultPrice } from '@/lib/priceService'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

type LabResultRecord = {
  at?: string
  testType?: string
  result: string
  completedAt?: string
  attachmentPath?: string
  technicianNotes?: string
  releasedToDoctorAt?: string
}

async function addReleaseBillingItem(params: {
  visitId: string
  patientId: string
  generatedBy: string
  testLabel: string
  releaseAt: string
}) {
  const { visitId, patientId, generatedBy, testLabel, releaseAt } = params
  const serviceType = mapTestToServiceType(testLabel, 'Lab')
  const price = getDefaultPrice(serviceType)
  const marker = `[LAB_RELEASE:${releaseAt}]`
  const description = `Lab Result Release Fee: ${testLabel} ${marker}`

  let bill = await prisma.bill.findUnique({ where: { visitId } })
  if (!bill) {
    bill = await prisma.bill.create({
      data: {
        visitId,
        patientId,
        generatedBy,
        items: [],
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        paymentStatus: 'Pending',
      },
    })
  }

  const items =
    (bill.items as Array<{ description?: string; total?: number; department?: string; quantity?: number; unitPrice?: number; addedAt?: string; addedBy?: string }>) ||
    []
  if (items.some((item) => String(item.description || '').includes(marker))) return

  const nextItems = [
    ...items,
    {
      department: 'Lab',
      description,
      quantity: 1,
      unitPrice: price,
      total: price,
      addedAt: new Date().toISOString(),
      addedBy: generatedBy,
    },
  ]
  const subtotal = nextItems.reduce((sum, item) => sum + Number(item.total || 0), 0)
  const total = subtotal + Number(bill.tax ?? 0) - Number(bill.discount ?? 0)
  await prisma.bill.update({
    where: { id: bill.id },
    data: { items: nextItems, subtotal, total, updatedAt: new Date() },
  })
}

async function resolveBillGeneratorId(preferredId?: string | null) {
  if (preferredId && preferredId.trim()) return preferredId.trim()
  const fallbackUser = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'DOCTOR'] } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  return fallbackUser?.id || ''
}

// POST /api/lab/er-beds/release-result — release completed lab result to doctor
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['LAB_TECH', 'ADMIN'].includes(user.role)) return forbidden()

    const body = (await request.json().catch(() => ({}))) as {
      visitId?: string
      at?: string
    }
    const { visitId, at } = body
    if (!visitId || !at) {
      return NextResponse.json({ error: 'visitId and at are required' }, { status: 400 })
    }

    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, notes: true, patientId: true, doctorId: true },
    })
    if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

    let parsed: Record<string, unknown> = {}
    try {
      if (visit.notes) parsed = JSON.parse(visit.notes) as Record<string, unknown>
    } catch {
      parsed = {}
    }

    const list = ((parsed.labResults as LabResultRecord[]) || []).slice()
    const idx = list.findIndex((r) => String(r.at) === String(at))
    if (idx === -1) {
      return NextResponse.json({ error: 'Completed lab result not found' }, { status: 404 })
    }

    if (list[idx].releasedToDoctorAt) {
      return NextResponse.json({ success: true, alreadyReleased: true, releasedAt: list[idx].releasedToDoctorAt })
    }

    const releasedAt = new Date().toISOString()
    const testLabel = list[idx].testType || 'Lab'
    list[idx] = { ...list[idx], releasedToDoctorAt: releasedAt }

    const generatorId = await resolveBillGeneratorId(visit.doctorId || null)
    if (!generatorId) {
      return NextResponse.json({ error: 'No valid billing user available' }, { status: 500 })
    }

    await addReleaseBillingItem({
      visitId,
      patientId: visit.patientId,
      generatedBy: generatorId,
      testLabel,
      releaseAt: String(at),
    })

    await prisma.$executeRawUnsafe(
      `
      UPDATE visits
      SET notes = $2,
          "updatedAt" = $3
      WHERE id = $1
      `,
      visitId,
      JSON.stringify({
        ...parsed,
        labResults: list,
      }),
      new Date()
    )

    return NextResponse.json({ success: true, releasedAt })
  } catch (e: unknown) {
    const err = e as Error
    console.error('release-lab-result:', err)
    return NextResponse.json({ error: err?.message || 'Failed to release lab result' }, { status: 500 })
  }
}
