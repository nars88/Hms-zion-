import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'
import { logEmergencyActivity } from '@/lib/emergencyActivity'
import { mapTestToServiceType, getDefaultPrice } from '@/lib/priceService'

export const dynamic = 'force-dynamic'

type DiagnosticDepartment = 'Lab' | 'Radiology' | 'Sonar' | 'ECG'
type DiagnosticRequestItem = {
  department?: DiagnosticDepartment
  testName?: string
  content?: string
  note?: string
  priority?: string
}
const DEPARTMENT_TO_TYPE: Record<DiagnosticDepartment, string> = {
  Lab: 'LAB_REQUESTED',
  Radiology: 'RADIOLOGY_REQUESTED',
  Sonar: 'SONAR_REQUESTED',
  ECG: 'ECG_REQUESTED',
}

async function addDiagnosticBillingItem(params: {
  visitId: string
  patientId: string
  generatedBy: string
  department: DiagnosticDepartment
  testLabel: string
  orderAt: string
  addedBy: string
}) {
  const { visitId, patientId, generatedBy, department, testLabel, orderAt, addedBy } = params
  const serviceType = mapTestToServiceType(testLabel, department === 'Lab' ? 'Lab' : department === 'Sonar' ? 'Sonar' : 'Radiology')
  const price = getDefaultPrice(serviceType)
  const marker = `[DIAG_REQUEST:${department}:${orderAt}]`
  const description = `${department} Request Fee: ${testLabel} ${marker}`

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
      addedBy,
    },
  ]
  const subtotal = nextItems.reduce((sum, item) => sum + Number(item.total || 0), 0)
  const total = subtotal + Number(bill.tax ?? 0) - Number(bill.discount ?? 0)

  await prisma.bill.update({
    where: { id: bill.id },
    data: {
      items: nextItems,
      subtotal,
      total,
      updatedAt: new Date(),
    },
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

// POST /api/emergency/doctor/lab-request - Append lab / X-Ray / Sonar request
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['DOCTOR', 'ADMIN'].includes(user.role)) return forbidden()

    const body = await request.json()
    const { visitId, content, department } = body as {
      visitId?: string
      content?: string
      department?: DiagnosticDepartment
      items?: DiagnosticRequestItem[]
    }
    if (!visitId) {
      return NextResponse.json({ error: 'visitId required' }, { status: 400 })
    }

    const normalizedItems: Array<{ department: DiagnosticDepartment; testLabel: string; note?: string; priority?: string }> =
      Array.isArray(body?.items) && body.items.length > 0
        ? body.items
            .map((item: DiagnosticRequestItem) => {
              const dept: DiagnosticDepartment =
                item?.department === 'ECG'
                  ? 'ECG'
                  : item?.department === 'Radiology' || item?.department === 'Sonar'
                    ? item.department
                    : 'Lab'
              const testLabel = String(item?.testName || item?.content || '').trim()
              return {
                department: dept,
                testLabel,
                note: typeof item?.note === 'string' ? item.note.trim() : undefined,
                priority: typeof item?.priority === 'string' ? item.priority.trim() : undefined,
              }
            })
            .filter((item: { testLabel: string }) => item.testLabel.length > 0)
        : (() => {
            const fallbackLabel = String(content || '').trim()
            if (!fallbackLabel) return []
            const dept: DiagnosticDepartment =
              department === 'ECG'
                ? 'ECG'
                : department === 'Radiology' || department === 'Sonar'
                  ? department
                  : 'Lab'
            return [{ department: dept, testLabel: fallbackLabel }]
          })()

    if (normalizedItems.length === 0) {
      return NextResponse.json({ error: 'At least one diagnostic item is required' }, { status: 400 })
    }

    const visitRows = await prisma.$queryRawUnsafe<Array<{ id: string; notes: string | null; patientId: string; doctorId: string | null }>>(
      `
      SELECT id, notes, "patientId", "doctorId"
      FROM visits
      WHERE id = $1
      LIMIT 1
      `,
      visitId
    )
    const visit = visitRows[0]
    if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

    let parsed: Record<string, unknown> = {}
    try {
      if (visit.notes) parsed = JSON.parse(visit.notes) as Record<string, unknown>
    } catch (_) {}
    const erOrders = (parsed.erOrders as Array<{ type: string; content?: string; at: string; status?: string; department?: string }>) || []
    const orderTimes: string[] = []
    for (let idx = 0; idx < normalizedItems.length; idx += 1) {
      const item = normalizedItems[idx]
      const orderAt = new Date(Date.now() + idx).toISOString()
      orderTimes.push(orderAt)
      const detail = [item.testLabel, item.note].filter(Boolean).join(' | ')
      erOrders.push({
        type: DEPARTMENT_TO_TYPE[item.department],
        content: detail,
        at: orderAt,
        status: item.priority?.toUpperCase() === 'URGENT' ? 'URGENT' : 'PENDING',
        department: item.department,
      })
    }
    await prisma.$executeRawUnsafe(
      `
      UPDATE visits
      SET notes = $2, "updatedAt" = $3
      WHERE id = $1
      `,
      visitId,
      JSON.stringify({ ...parsed, erOrders }),
      new Date()
    )
    const generatorId = await resolveBillGeneratorId(visit.doctorId || user?.id || null)
    if (!generatorId) {
      return NextResponse.json({ error: 'No valid billing user available' }, { status: 500 })
    }

    for (let idx = 0; idx < normalizedItems.length; idx += 1) {
      const item = normalizedItems[idx]
      await addDiagnosticBillingItem({
        visitId,
        patientId: visit.patientId,
        generatedBy: generatorId,
        department: item.department,
        testLabel: item.testLabel,
        orderAt: orderTimes[idx],
        addedBy: generatorId,
      })
    }

    await logEmergencyActivity({
      visitId,
      action: 'Diagnostic Requested',
      details: normalizedItems.map((i) => `${i.department} - ${i.testLabel}`).join(' | '),
      actorUserId: user?.id ?? null,
      actorName: user?.name ?? user?.role ?? null,
    })
    return NextResponse.json({
      success: true,
      count: normalizedItems.length,
      message: `${normalizedItems.length} diagnostic request(s) sent`,
    })
  } catch (e: unknown) {
    const err = e as Error
    console.error('Error creating ER lab request:', err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
