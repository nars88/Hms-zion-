import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mapTestToServiceType, getDefaultPrice } from '@/lib/priceService'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

type DiagnosticDepartment = 'Lab' | 'Radiology' | 'Sonar' | 'ECG'
const RESULTS_KEYS: Record<DiagnosticDepartment, string> = {
  Lab: 'labResults',
  Radiology: 'radiologyResults',
  Sonar: 'sonarResults',
  ECG: 'ecgResults',
}

interface ResultEntry {
  at?: string
  testType?: string
  result: string
  completedAt?: string
  attachmentPath?: string
  technicianNotes?: string
  releasedToDoctorAt?: string
}

async function addResultBillingItem(params: {
  visitId: string
  patientId: string
  generatedBy: string
  department: DiagnosticDepartment
  testLabel: string
  resultAt: string
}) {
  const { visitId, patientId, generatedBy, department, testLabel, resultAt } = params
  const serviceType = mapTestToServiceType(testLabel, department === 'Lab' ? 'Lab' : department === 'Sonar' ? 'Sonar' : 'Radiology')
  const price = getDefaultPrice(serviceType)
  const marker = `[DIAG_RESULT:${department}:${resultAt}]`
  const description = `${department} Result Processing Fee: ${testLabel} ${marker}`

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
      department,
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

// POST /api/lab/er-beds/result - Save diagnostic result (Lab / Radiology / Sonar) with optional file
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['LAB_TECH', 'ADMIN'].includes(user.role)) return forbidden()

    const body = await request.json()
    const { visitId, at, testType, result, department, attachmentPath, technicianNotes } = body
    if (!visitId || (result !== undefined && typeof result !== 'string')) {
      return NextResponse.json({ error: 'visitId required; result must be string if provided' }, { status: 400 })
    }
    const resultText = typeof result === 'string' ? result.trim() : ''
    if (!resultText && !attachmentPath) {
      return NextResponse.json({ error: 'Provide at least result text or attachment' }, { status: 400 })
    }
    const dept: DiagnosticDepartment =
      department === 'Radiology' || department === 'Sonar' || department === 'ECG' ? department : 'Lab'
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, notes: true, patientId: true, doctorId: true },
    })
    if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

    let parsed: Record<string, unknown> = {}
    try {
      if (visit.notes) parsed = JSON.parse(visit.notes) as Record<string, unknown>
    } catch (_) {}
    const key = RESULTS_KEYS[dept]
    const existing = (parsed[key] as ResultEntry[]) || []
    const completedAt = new Date().toISOString()
    const isImaging = dept === 'Radiology' || dept === 'Sonar' || dept === 'ECG'
    const newEntry: ResultEntry = {
      at: at || undefined,
      testType: testType || undefined,
      result: resultText || '(See attachment)',
      completedAt,
      attachmentPath: attachmentPath || undefined,
      technicianNotes:
        typeof technicianNotes === 'string' && technicianNotes.trim()
          ? technicianNotes.trim()
          : undefined,
    }

    const hasOrderAt = at != null && String(at).trim().length > 0
    let nextResults: ResultEntry[]
    if (isImaging && hasOrderAt) {
      const i = existing.findIndex((r) => String(r.at) === String(at))
      if (i >= 0) {
        const prev = existing[i]
        const prevReleased =
          typeof prev.releasedToDoctorAt === 'string' && prev.releasedToDoctorAt.trim()
            ? prev.releasedToDoctorAt.trim()
            : undefined
        nextResults = [...existing]
        nextResults[i] = {
          ...prev,
          ...newEntry,
          at: prev.at || newEntry.at,
          releasedToDoctorAt: prevReleased,
        }
      } else {
        nextResults = [...existing, newEntry]
      }
    } else {
      nextResults = [...existing, newEntry]
    }

    const erOrders = (parsed.erOrders as Array<{ at?: string; type?: string; status?: string }>) || []
    const updatedErOrders = hasOrderAt
      ? erOrders.map((order) =>
          String(order.at) === String(at) ? { ...order, status: 'COMPLETED' } : order
        )
      : isImaging
        ? erOrders
        : erOrders.map((order) => (String(order.at) === String(at) ? { ...order, status: 'COMPLETED' } : order))
    parsed.erOrders = updatedErOrders

    const lastResultAt = (parsed.lastResultAt as Record<string, string>) || {}
    if (!isImaging) {
      lastResultAt[dept] = completedAt
    }
    parsed.lastResultAt = lastResultAt

    const referenceAt = at || completedAt
    const testLabel = testType || dept
    const generatorId = await resolveBillGeneratorId(visit.doctorId || null)
    if (!generatorId) {
      return NextResponse.json({ error: 'No valid billing user available' }, { status: 500 })
    }
    await addResultBillingItem({
      visitId,
      patientId: visit.patientId,
      generatedBy: generatorId,
      department: dept,
      testLabel,
      resultAt: referenceAt,
    })

    await prisma.$executeRawUnsafe(
      `
      UPDATE visits
      SET notes = $2,
          "updatedAt" = $3
      WHERE id = $1
      `,
      visitId,
      JSON.stringify({ ...parsed, [key]: nextResults }),
      new Date()
    )
    return NextResponse.json({ success: true, completedAt, statusUpdatedToReadyForReview: false })
  } catch (e: unknown) {
    const err = e as Error
    console.error('Error saving lab result:', err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
