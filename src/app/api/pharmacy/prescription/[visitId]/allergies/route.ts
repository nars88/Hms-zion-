import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/pharmacy/prescription/[visitId]/allergies
// Returns patient allergies for a specific visit (for safety check)
export async function GET(
  request: Request,
  { params }: { params: { visitId: string } }
) {
  try {
    const { visitId } = params

    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            allergies: true,
          },
        },
        prescription: true,
      },
    })

    if (!visit || !visit.patient) {
      return NextResponse.json(
        { error: 'Visit or patient not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      patientId: visit.patient.id,
      patientName: `${visit.patient.firstName} ${visit.patient.lastName}`,
      allergies: visit.patient.allergies || null,
      prescription: visit.prescription || null,
    })
  } catch (error) {
    console.error('❌ Error fetching patient allergies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch allergies' },
      { status: 500 }
    )
  }
}

