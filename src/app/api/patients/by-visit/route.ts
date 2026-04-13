import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/patients/by-visit?visitId=XXX
// Get patient information by Visit ID
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const visitId = searchParams.get('visitId')

    if (!visitId) {
      return NextResponse.json(
        { error: 'Visit ID is required' },
        { status: 400 }
      )
    }

    // Find visit
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        patient: true,
      },
    })

    if (!visit) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      patient: {
        id: visit.patient.id,
        firstName: visit.patient.firstName,
        lastName: visit.patient.lastName,
        phone: visit.patient.phone,
        dateOfBirth: visit.patient.dateOfBirth,
        gender: visit.patient.gender,
      },
      visit: {
        id: visit.id,
        visitId: visit.id,
        status: visit.status,
      },
    })
  } catch (error: any) {
    console.error('❌ Error fetching patient by visit:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch patient' },
      { status: 500 }
    )
  }
}

