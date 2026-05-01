import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

const DIAG_ORDER_TYPES = ['LAB', 'LAB_REQUESTED', 'RADIOLOGY_REQUESTED', 'SONAR_REQUESTED']
const ORDER_TO_RESULTS: Record<string, 'labResults' | 'radiologyResults' | 'sonarResults'> = {
  LAB: 'labResults',
  LAB_REQUESTED: 'labResults',
  RADIOLOGY_REQUESTED: 'radiologyResults',
  SONAR_REQUESTED: 'sonarResults',
}

// POST /api/emergency/doctor/ready-for-discharge
// Checks no pending diagnostics; sets visit to Billing and creates bill so patient appears in Accountant Pending list.
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['DOCTOR', 'ADMIN'].includes(user.role)) return forbidden()

    const body = await request.json()
    const { visitId } = body
    if (!visitId) {
      return NextResponse.json({ error: 'visitId required' }, { status: 400 })
    }
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, patientId: true, notes: true, bedNumber: true },
    })
    if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

    let parsed: {
      erOrders?: Array<{ type: string; content?: string; at: string }>
      labResults?: Array<{ at?: string }>
      radiologyResults?: Array<{ at?: string; releasedToDoctorAt?: string }>
      sonarResults?: Array<{ at?: string; releasedToDoctorAt?: string }>
    } = {}
    try {
      if (visit.notes) parsed = JSON.parse(visit.notes)
    } catch (_) {}
    const erOrders = parsed.erOrders || []

    for (const order of erOrders) {
      if (!DIAG_ORDER_TYPES.includes(order.type)) continue
      const resultsKey = ORDER_TO_RESULTS[order.type]
      const results = (parsed[resultsKey] as Array<{ at?: string; releasedToDoctorAt?: string }>) || []
      const hasResult =
        order.type === 'RADIOLOGY_REQUESTED' || order.type === 'SONAR_REQUESTED'
          ? results.some((r) => String(r.at) === String(order.at) && Boolean(r.releasedToDoctorAt))
          : results.some((r) => String(r.at) === String(order.at))
      if (!hasResult) {
        return NextResponse.json(
          { error: 'Cannot mark ready: pending Lab, X-Ray, or Sonar results. Complete or remove them first.' },
          { status: 400 }
        )
      }
    }

    const existingBill = await prisma.bill.findUnique({ where: { visitId } })
    if (!existingBill) {
      const defaultItems = [
        { department: 'ER', description: 'Bed fee', quantity: 1, unitPrice: 0, total: 0 },
        { department: 'Lab', description: 'Lab fees', quantity: 1, unitPrice: 0, total: 0 },
        { department: 'Pharmacy', description: 'Pharmacy fees', quantity: 1, unitPrice: 0, total: 0 },
      ]
      await prisma.bill.create({
        data: {
          visitId,
          patientId: visit.patientId,
          generatedBy: 'system',
          items: defaultItems,
          subtotal: 0,
          tax: 0,
          discount: 0,
          total: 0,
          paymentStatus: 'Pending',
        },
      })
    }

    let parsedNotes: Record<string, unknown> = {}
    try {
      if (visit.notes) parsedNotes = JSON.parse(visit.notes) as Record<string, unknown>
    } catch {
      parsedNotes = {}
    }

    await prisma.visit.update({
      where: { id: visitId },
      data: {
        status: VisitStatus.Billing,
        notes: JSON.stringify({
          ...parsedNotes,
          bedExitState: visit.bedNumber != null ? 'PENDING_EXIT' : 'AVAILABLE',
          bedExitMarkedAt: new Date().toISOString(),
        }),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Patient ready for billing. They now appear in Accountant Pending Payment list.',
    })
  } catch (e: unknown) {
    const err = e as Error
    console.error('Ready for discharge error:', err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
