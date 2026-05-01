import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EmergencyTaskStatus, VisitStatus } from '@prisma/client'
import { getRequestUser, forbidden, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// GET /api/emergency/tasks/recent — recently completed nurse tasks from EmergencyTask table.
export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['ER_NURSE', 'ADMIN'].includes(user.role)) return forbidden()

    const visits = await prisma.visit.findMany({
      where: {
        status: { notIn: [VisitStatus.Discharged] },
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
          where: { type: 'NURSE_TASK', status: EmergencyTaskStatus.COMPLETED },
          orderBy: { completedAt: 'desc' },
          take: 20,
          select: {
            id: true,
            title: true,
            createdAt: true,
            completedAt: true,
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

    const doneTasks: Array<{
      taskId: string
      visitId: string
      patientName: string
      bedNumber: number | null
      type: string
      content?: string
      at: string
      completedAt: string
      status: 'DONE'
      priority: 'CRITICAL' | 'NORMAL'
    }> = []

    for (const v of visits) {
      const bedNumber = v.bedNumber ?? null
      const patientName = `${v.patient?.firstName ?? ''} ${v.patient?.lastName ?? ''}`.trim()
      try {
        const parsed = v.notes ? (JSON.parse(v.notes) as { erCriticalAlert?: boolean }) : {}
        const priority: 'CRITICAL' | 'NORMAL' = parsed.erCriticalAlert ? 'CRITICAL' : 'NORMAL'
        for (const task of v.emergencyTasks) {
          const completedAt = task.completedAt ?? task.createdAt
          doneTasks.push({
            taskId: task.id,
            visitId: v.id,
            patientName,
            bedNumber,
            type: 'NURSE_TASK',
            content: task.title,
            at: task.createdAt.toISOString(),
            completedAt: completedAt.toISOString(),
            status: 'DONE',
            priority,
          })
        }
      } catch (_) {}
    }
    doneTasks.sort((a, b) => (b.completedAt > a.completedAt ? 1 : -1))
    return NextResponse.json(doneTasks.slice(0, 20))
  } catch (e) {
    console.error('Error fetching recent ER tasks:', e)
    return NextResponse.json({ error: 'Failed to fetch recent tasks' }, { status: 500 })
  }
}
