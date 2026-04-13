import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const visits = await prisma.visit.findMany({
      where: {
        status: { not: VisitStatus.Discharged },
        OR: [
          { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' } },
          { chiefComplaint: { contains: 'ER', mode: 'insensitive' } },
        ],
      },
      select: { id: true, notes: true },
    })

    await prisma.patient.updateMany({
      data: {
        sonarStatus: null,
        sonarImage: null,
        sonarNotes: null,
      },
    })

    await Promise.all(
      visits.map(async (visit) => {
        let parsed: Record<string, unknown> = {}
        try {
          if (visit.notes) parsed = JSON.parse(visit.notes) as Record<string, unknown>
        } catch (_) {}

        const erOrders = (parsed.erOrders as Array<{ type?: string; status?: string; at?: string; content?: string }>) || []
        const normalizedOrders = erOrders.map((o) => {
          if (
            o.type === 'LAB' ||
            o.type === 'LAB_REQUESTED' ||
            o.type === 'RADIOLOGY_REQUESTED' ||
            o.type === 'SONAR_REQUESTED'
          ) {
            return { ...o, status: 'PENDING' }
          }
          return o
        })

        const clean = {
          ...parsed,
          erOrders: normalizedOrders,
          labResults: [],
          radiologyResults: [],
          sonarResults: [],
          lastResultAt: {},
          lastReviewedAt: {},
        }

        await prisma.visit.update({
          where: { id: visit.id },
          data: { notes: JSON.stringify(clean), updatedAt: new Date() },
        })
      })
    )

    return NextResponse.json({ success: true, message: 'All simulated data reset. Pending queues restored.' })
  } catch (e: unknown) {
    const err = e as Error
    return NextResponse.json({ error: err?.message || 'Reset failed' }, { status: 500 })
  }
}
