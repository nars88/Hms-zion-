import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/security/check/[patientId]
// Returns QR status for a patient (for security guard scanning)
export async function GET(
  request: Request,
  { params }: { params: { patientId: string } }
) {
  try {
    const { patientId } = params

    // Find the most recent visit with a bill for this patient
    const visit = await prisma.visit.findFirst({
      where: {
        patientId,
        bill: { isNot: null },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        bill: {
          select: {
            id: true,
            qrStatus: true,
            paymentStatus: true,
            total: true,
          },
        },
      },
    })

    if (!visit || !visit.bill) {
      return NextResponse.json(
        { error: 'No active visit or invoice found for this patient' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      patientId: visit.patient.id,
      patientName: `${visit.patient.firstName} ${visit.patient.lastName}`,
      visitId: visit.id,
      qrStatus: visit.bill.qrStatus || 'LOCKED',
      paymentStatus: visit.bill.paymentStatus,
      total: Number(visit.bill.total),
    })
  } catch (error) {
    console.error('❌ Error checking patient QR status:', error)
    return NextResponse.json(
      { error: 'Failed to check patient status' },
      { status: 500 }
    )
  }
}

