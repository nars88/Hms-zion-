import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET /api/lab/er-requests - Lab requests originating from ER Doctor (from Visit.notes)
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
        patientId: true,
        notes: true,
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    const requests: Array<{
      id: string
      visitId: string
      patientId: string
      patientName: string
      bedNumber: number | null
      testType: string
      requestedAt: string
      status: string
    }> = []
    for (const v of visits) {
      try {
        if (!v.notes) continue
        const parsed = JSON.parse(v.notes) as { erOrders?: Array<{ type: string; content?: string; at: string; status?: string }> }
        const erOrders = parsed.erOrders || []
        const patientName = `${v.patient?.firstName ?? ''} ${v.patient?.lastName ?? ''}`.trim()
        const bedNumber = (v as { bedNumber?: number | null }).bedNumber ?? null
        for (const order of erOrders) {
          if (order.type === 'LAB' || order.type === 'LAB_REQUESTED') {
            requests.push({
              id: `ER-${v.id}-${order.at}`,
              visitId: v.id,
              patientId: v.patientId,
              patientName,
              bedNumber,
              testType: order.content || 'Lab/X-Ray',
              requestedAt: order.at,
              status: order.status || 'Pending',
            })
          }
        }
      } catch (_) {}
    }
    requests.sort((a, b) => (b.requestedAt > a.requestedAt ? 1 : -1))
    return NextResponse.json(requests)
  } catch (e) {
    console.error('Error fetching ER lab requests:', e)
    // Lab dashboard/Admin view: return empty array on failure instead of 500
    return NextResponse.json([])
  }
}
