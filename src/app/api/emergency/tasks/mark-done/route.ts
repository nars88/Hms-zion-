import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import { getRequestUser, forbidden, unauthorized } from '@/lib/apiAuth'
import { logEmergencyActivity } from '@/lib/emergencyActivity'
import { releaseBedFromVisit } from '@/lib/emergency/bedAllocation'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['ER_NURSE', 'ADMIN'].includes(user.role)) return forbidden()

    const body = await request.json()
    const visitId = body.visitId
    const at = body.at
    if (!visitId || !at) {
      return NextResponse.json({ error: 'visitId and at required' }, { status: 400 })
    }
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, notes: true, status: true },
    })
    if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

    let parsed: Record<string, unknown> = {}
    try {
      if (visit.notes) parsed = JSON.parse(visit.notes) as Record<string, unknown>
    } catch (_) {}
    const erOrders = (parsed.erOrders as Array<{ type: string; content?: string; at: string; status?: string }>) || []
    let found = false
    let nurseTask = false
    for (const order of erOrders) {
      if (order.at === at) {
        order.status = 'DONE'
        found = true
        nurseTask = order.type === 'NURSE_TASK'
        break
      }
    }
    if (!found) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    const now = new Date()
    const nextNotes = nurseTask
      ? {
          ...parsed,
          erOrders,
          erFlowStatus: 'FINISHED' as const,
          nurseTaskFinishedAt: now.toISOString(),
        }
      : { ...parsed, erOrders }

    await prisma.$transaction(async (tx) => {
      if (nurseTask && visit.status !== VisitStatus.COMPLETED) {
        await releaseBedFromVisit(tx, visitId)
      }

      await tx.visit.update({
        where: { id: visitId },
        data: {
          notes: JSON.stringify(nextNotes),
          updatedAt: now,
          ...(nurseTask && visit.status !== VisitStatus.COMPLETED
            ? {
                status: VisitStatus.COMPLETED,
                dischargeDate: now,
                bedNumber: null,
              }
            : {}),
        },
      })
    })
    if (nurseTask) {
      await logEmergencyActivity({
        visitId,
        action: 'Task Completed',
        details: 'Nurse task marked as completed',
        actorUserId: user.id,
        actorName: user.name ?? user.role,
      })
    }
    return NextResponse.json({ success: true, visitFinished: nurseTask })
  } catch (e: unknown) {
    const err = e as Error
    console.error('Error marking task done:', err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
