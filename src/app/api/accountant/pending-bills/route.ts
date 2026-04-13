import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET /api/accountant/pending-bills
// Returns all visits with COMPLETED status that have pending bills
export async function GET() {
  try {
    const visits = await prisma.visit.findMany({
      where: {
        status: VisitStatus.COMPLETED,
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
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    // Filter to only include visits with pending bills
    const pendingBills = visits
      .filter((visit) => visit.bill && visit.bill.paymentStatus === 'Pending')
      .map((visit) => ({
        visitId: visit.id,
        patientId: visit.patientId,
        patientName: `${visit.patient.firstName} ${visit.patient.lastName}`,
        patientPhone: visit.patient.phone,
        doctorName: visit.doctor?.name || 'Unknown',
        bill: visit.bill,
        visitDate: visit.createdAt,
        completedAt: visit.updatedAt,
      }))

    return NextResponse.json({
      success: true,
      bills: pendingBills,
    })
  } catch (error: any) {
    console.error('❌ Error fetching pending bills:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch pending bills' },
      { status: 500 }
    )
  }
}

