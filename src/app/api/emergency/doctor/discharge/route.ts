import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

const DIAG_ORDER_TYPES = ['LAB', 'LAB_REQUESTED', 'RADIOLOGY_REQUESTED', 'SONAR_REQUESTED']
const RESULTS_KEYS = ['labResults', 'radiologyResults', 'sonarResults'] as const
const ORDER_TO_RESULTS: Record<string, (typeof RESULTS_KEYS)[number]> = {
  LAB: 'labResults',
  LAB_REQUESTED: 'labResults',
  RADIOLOGY_REQUESTED: 'radiologyResults',
  SONAR_REQUESTED: 'sonarResults',
}

// POST /api/emergency/doctor/discharge - Move visit to Billing, clear bed, append task to notes
// Blocks if any Lab/Radiology/Sonar request is still pending (no result uploaded).
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
      select: { id: true, notes: true, bedNumber: true },
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

    // Block discharge if any diagnostic order has no result yet
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
          { error: 'Cannot discharge: pending Lab, X-Ray, or Sonar results. Wait for results or remove the request.' },
          { status: 400 }
        )
      }
    }

    erOrders.push({ type: 'DISCHARGED', at: new Date().toISOString() })
    const notesPayload = { ...parsed, erOrders }

    await prisma.visit.update({
      where: { id: visitId },
      data: {
        // Keep bed occupied as pending-exit until Accountant confirms payment.
        status: VisitStatus.Billing,
        notes: JSON.stringify({
          ...notesPayload,
          bedExitState: visit.bedNumber != null ? 'PENDING_EXIT' : 'AVAILABLE',
          bedExitMarkedAt: new Date().toISOString(),
        }),
        updatedAt: new Date(),
      },
    })
    return NextResponse.json({ success: true, message: 'Patient moved to Billing queue; bed marked PENDING_EXIT until payment.' })
  } catch (e: any) {
    console.error('Error discharging:', e)
    return NextResponse.json({ error: e?.message || 'Failed to discharge' }, { status: 500 })
  }
}
