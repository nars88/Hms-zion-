import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestUser } from '@/lib/apiAuth'
import { logEmergencyActivity } from '@/lib/emergencyActivity'

export const dynamic = 'force-dynamic'

// POST /api/emergency/doctor/append-task — append erOrders row (PHARMACY audit, NURSE_TASK, etc.)
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request).catch(() => null)
    const body = (await request.json()) as {
      visitId?: string
      type?: string
      content?: string
      status?: string
      assigneeUserId?: string | null
    }
    const { visitId, type, content, status: statusIn, assigneeUserId } = body
    if (!visitId || !type) {
      return NextResponse.json({ error: 'visitId and type required' }, { status: 400 })
    }
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, notes: true },
    })
    if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

    let parsed: Record<string, unknown> = {}
    try {
      if (visit.notes) parsed = JSON.parse(visit.notes) as Record<string, unknown>
    } catch (_) {}
    const erOrders = (parsed.erOrders as Array<{ type: string; content?: string; at: string; status?: string }>) || []
    const t = String(type)
    let status = typeof statusIn === 'string' && statusIn.trim() ? statusIn.trim() : ''
    if (!status) {
      if (t === 'NURSE_TASK') status = 'TASK_PENDING'
      else status = 'DONE'
    }
    const assignee =
      assigneeUserId === undefined || assigneeUserId === null || String(assigneeUserId).trim() === ''
        ? 'POOL'
        : String(assigneeUserId).trim()
    erOrders.push({
      type: t,
      content: content != null ? String(content) : undefined,
      at: new Date().toISOString(),
      status,
      ...(t === 'NURSE_TASK' ? { assigneeUserId: assignee } : {}),
    })
    await prisma.visit.update({
      where: { id: visitId },
      data: { notes: JSON.stringify({ ...parsed, erOrders }), updatedAt: new Date() },
    })

    if (t === 'NURSE_TASK') {
      await logEmergencyActivity({
        visitId,
        action: 'Task Assigned',
        details: content ? String(content) : 'Nurse task assigned',
        actorUserId: user?.id ?? null,
        actorName: user?.name ?? user?.role ?? null,
      })
    } else if (t === 'PHARMACY_SENT') {
      await logEmergencyActivity({
        visitId,
        action: 'Medication Sent to Pharmacy',
        details: content ? String(content) : 'Medication order sent to Pharmacy & Finance',
        actorUserId: user?.id ?? null,
        actorName: user?.name ?? user?.role ?? null,
      })
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const err = e as Error
    console.error('Error appending task:', err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}
