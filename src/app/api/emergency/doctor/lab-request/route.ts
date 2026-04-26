import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestUser } from '@/lib/apiAuth'
import { logEmergencyActivity } from '@/lib/emergencyActivity'
import { mapTestToServiceType, getDefaultPrice } from '@/lib/priceService'

export const dynamic = 'force-dynamic'

type DiagnosticDepartment = 'Lab' | 'Radiology' | 'Sonar' | 'ECG'
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
    const user = await getRequestUser(request).catch(() => null)
    const body = await request.json()
    const { visitId, content, department } = body
    if (!visitId || !content || !String(content).trim()) {
      return NextResponse.json({ error: 'visitId and content required' }, { status: 400 })
    }
    const dept: DiagnosticDepartment =
      department === 'ECG'
        ? 'ECG'
        : department === 'Radiology' || department === 'Sonar'
          ? department
          : 'Lab'
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, notes: true, patientId: true, doctorId: true },
    })
    if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

    let parsed: Record<string, unknown> = {}
    try {
      if (visit.notes) parsed = JSON.parse(visit.notes) as Record<string, unknown>
    } catch (_) {}
    const erOrders = (parsed.erOrders as Array<{ type: string; content?: string; at: string; status?: string; department?: string }>) || []
    const orderAt = new Date().toISOString()
    const cleanContent = String(content).trim()
    erOrders.push({
      type: DEPARTMENT_TO_TYPE[dept],
      content: cleanContent,
      at: orderAt,
      status: 'PENDING',
      department: dept,
    })
    await prisma.visit.update({
      where: { id: visitId },
      data: { notes: JSON.stringify({ ...parsed, erOrders }), updatedAt: new Date() },
    })
    const generatorId = await resolveBillGeneratorId(visit.doctorId || user?.id || null)
    if (!generatorId) {
      return NextResponse.json({ error: 'No valid billing user available' }, { status: 500 })
    }

    await addDiagnosticBillingItem({
      visitId,
      patientId: visit.patientId,
      generatedBy: generatorId,
      department: dept,
      testLabel: cleanContent,
      orderAt,
      addedBy: generatorId,
    })

    await logEmergencyActivity({
      visitId,
      action: 'Diagnostic Requested',
      details: `${dept} - ${cleanContent}`,
      actorUserId: user?.id ?? null,
      actorName: user?.name ?? user?.role ?? null,
    })
    return NextResponse.json({ success: true, message: 'Lab/X-Ray request sent' })
  } catch (e: unknown) {
    const err = e as Error
    console.error('Error creating ER lab request:', err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
