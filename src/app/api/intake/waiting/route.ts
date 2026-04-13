import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const visits = await prisma.visit.findMany({
      where: {
        status: 'Waiting',
        // Only patients who have no vitals recorded yet for this visit
        vitals: {
          none: {},
        },
      },
      orderBy: {
        visitDate: 'asc',
      },
      select: {
        id: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            triageLevel: true,
            allergies: true,
          },
        },
      },
    })

    const result = visits
      .filter(v => v.patient)
      .map(v => ({
        visitId: v.id,
        patientId: v.patient!.id,
        firstName: v.patient!.firstName,
        lastName: v.patient!.lastName,
        phone: v.patient!.phone,
        triageLevel: v.patient!.triageLevel,
        allergies: v.patient!.allergies,
      }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ Error fetching waiting patients for intake:', error)
    return NextResponse.json(
      { error: 'Failed to fetch waiting patients.' },
      { status: 500 }
    )
  }
}


