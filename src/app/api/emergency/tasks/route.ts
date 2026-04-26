import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import { getRequestUser, forbidden, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

export interface ERTask {
  visitId: string
  patientName: string
  bedNumber: number | null
  type: string
  content?: string
  at: string
  status?: string
  assigneeUserId?: string
  priority?: 'CRITICAL' | 'NORMAL'
}

// GET /api/emergency/tasks — pending NURSE_TASK for logged-in ER nurse (POOL or self)
export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['ER_NURSE', 'ADMIN'].includes(user.role)) return forbidden()

    const visits = await prisma.visit.findMany({
      where: {
        status: { notIn: [VisitStatus.Discharged, VisitStatus.COMPLETED] },
        OR: [
          { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' } },
          { chiefComplaint: { contains: 'ER', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        notes: true,
        bedNumber: true,
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    const tasks: ERTask[] = []
    for (const v of visits) {
      const bedNumber = v.bedNumber ?? null
      const patientName = `${v.patient?.firstName ?? ''} ${v.patient?.lastName ?? ''}`.trim()
      try {
        if (!v.notes) continue
        const parsed = JSON.parse(v.notes) as {
          erCriticalAlert?: boolean
          erOrders?: Array<{
            type: string
            content?: string
            at: string
            status?: string
            assigneeUserId?: string
          }>
        }
        const priority: 'CRITICAL' | 'NORMAL' = parsed.erCriticalAlert ? 'CRITICAL' : 'NORMAL'
        const erOrders = parsed.erOrders || []
        for (const order of erOrders) {
          if (order.type !== 'NURSE_TASK') continue
          const st = order.status || 'TASK_PENDING'
          if (st !== 'TASK_PENDING' && st !== 'PENDING') continue
          const assignee = order.assigneeUserId || 'POOL'
          if (user.role === 'ER_NURSE') {
            if (assignee !== 'POOL' && assignee !== user.id) continue
          }
          tasks.push({
            visitId: v.id,
            patientName,
            bedNumber,
            type: order.type,
            content: order.content,
            at: order.at,
            status: order.status,
            assigneeUserId: assignee,
            priority,
          })
        }
      } catch (_) {}
    }
    tasks.sort((a, b) => (b.at > a.at ? 1 : -1))
    return NextResponse.json(tasks)
  } catch (e) {
    console.error('Error fetching ER tasks:', e)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}
