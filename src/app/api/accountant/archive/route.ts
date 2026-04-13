import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET /api/accountant/archive
// Returns visits where status is Discharged or COMPLETED (archived)
export async function GET() {
  try {
    const visits = await prisma.visit.findMany({
      where: {
        status: { in: [VisitStatus.Discharged, VisitStatus.COMPLETED] },
        bill: { isNot: null },
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        bill: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    const rows = visits
      .filter((v) => v.bill)
      .map((visit) => ({
        visitId: visit.id,
        patientId: visit.patientId,
        patientName: visit.patient
          ? `${visit.patient.firstName} ${visit.patient.lastName}`
          : 'Unknown',
        totalAmount: Number(visit.bill!.total),
        date: visit.updatedAt,
        billId: visit.bill!.id,
        bill: visit.bill,
      }))

    return NextResponse.json({
      success: true,
      items: rows,
    })
  } catch (error: any) {
    console.error('❌ Error fetching archive:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load archive' },
      { status: 500 }
    )
  }
}
