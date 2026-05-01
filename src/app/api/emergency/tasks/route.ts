import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EmergencyTaskStatus, VisitStatus } from '@prisma/client'
import { getRequestUser, forbidden, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

export interface ERTask {
  taskId?: string
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

// GET /api/emergency/tasks — pending NURSE_TASK from normalized EmergencyTask table.
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
        emergencyTasks: {
          where: {
            type: 'NURSE_TASK',
            status: { in: [EmergencyTaskStatus.PENDING, EmergencyTaskStatus.CREATED] },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
        },
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
        const parsed = v.notes ? (JSON.parse(v.notes) as { erCriticalAlert?: boolean }) : {}
        const priority: 'CRITICAL' | 'NORMAL' = parsed.erCriticalAlert ? 'CRITICAL' : 'NORMAL'
        for (const task of v.emergencyTasks) {
          tasks.push({
            taskId: task.id,
            visitId: v.id,
            patientName,
            bedNumber,
            type: 'NURSE_TASK',
            content: task.title,
            at: task.createdAt.toISOString(),
            status: 'PENDING',
            assigneeUserId: 'POOL',
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
