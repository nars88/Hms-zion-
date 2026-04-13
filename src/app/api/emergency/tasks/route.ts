import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export interface ERTask {
  visitId: string
  patientName: string
  bedNumber: number | null
  type: string
  content?: string
  at: string
  status?: string
}

// GET /api/emergency/tasks - Returns tasks from all ER visits (for Nurse dashboard real-time sync)
export async function GET() {
  try {
    const visits = await prisma.visit.findMany({
      where: {
        status: { not: VisitStatus.Discharged },
        OR: [
          { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' } },
          { chiefComplaint: { contains: 'ER', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        notes: true,
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
      const bedNumber = (v as { bedNumber?: number | null }).bedNumber ?? null
      const patientName = `${v.patient?.firstName ?? ''} ${v.patient?.lastName ?? ''}`.trim()
      try {
        if (!v.notes) continue
        const parsed = JSON.parse(v.notes) as { erOrders?: Array<{ type: string; content?: string; at: string; status?: string }> }
        const erOrders = parsed.erOrders || []
        for (const order of erOrders) {
          tasks.push({
            visitId: v.id,
            patientName,
            bedNumber,
            type: order.type,
            content: order.content,
            at: order.at,
            status: order.status,
          })
        }
      } catch (_) {}
    }
    // Newest first
    tasks.sort((a, b) => (b.at > a.at ? 1 : -1))
    return NextResponse.json(tasks)
  } catch (e) {
    console.error('Error fetching ER tasks:', e)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}
