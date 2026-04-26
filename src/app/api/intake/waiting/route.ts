import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestUser, forbidden, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['INTAKE_NURSE', 'ER_NURSE', 'ADMIN'].includes(user.role)) return forbidden()

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
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch waiting patients.' },
      { status: 500 }
    )
  }
}


