import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import { getRequestUser, forbidden, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// GET /api/emergency/tasks/recent — recently completed nurse tasks
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
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    const doneTasks: Array<{
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
          if ((order.status || '').toUpperCase() !== 'DONE') continue
          doneTasks.push({
            visitId: v.id,
            patientName,
            bedNumber,
            type: order.type,
            content: order.content,
            at: order.at,
            completedAt: order.at,
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
