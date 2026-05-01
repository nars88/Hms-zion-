import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET /api/patients/search?q=query
// Search patients by name or phone
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        patients: [],
      })
    }

    // Search by name, phone, or direct patient ID; include latest active visit for ER fallback.
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          {
            id: {
              contains: query,
            },
          },
          {
            firstName: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            lastName: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            phone: {
              contains: query,
            },
          },
        ],
      },
      take: 10, // Limit results
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        visits: {
          where: {
            status: {
              notIn: [VisitStatus.Discharged, VisitStatus.COMPLETED],
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      patients: patients.map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        latestVisitId: p.visits[0]?.id ?? null,
      })),
    })
  } catch (error: any) {
    console.error('❌ Error searching patients:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to search patients' },
      { status: 500 }
    )
  }
}

