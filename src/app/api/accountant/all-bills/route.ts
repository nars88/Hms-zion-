import { NextResponse } from 'next/server'
import { unstable_noStore as noStore } from 'next/cache'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/accountant/all-bills
// Returns all visits that have a bill (including ER pending: Waiting/In_Consultation with bill)
export async function GET() {
  noStore()
  // Next may invoke handlers during `next build`; avoid DB I/O on Vercel build workers (env/Prisma engine edge cases).
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return NextResponse.json({ success: true, bills: [] })
  }
  try {
    const [{ prisma }, { VisitStatus }] = await Promise.all([
      import('@/lib/prisma'),
      import('@prisma/client'),
    ])

    // Active queue: exclude Discharged and COMPLETED (archived visits are on /accountant/archive)
    const visits = await prisma.visit.findMany({
      where: {
        bill: { isNot: null },
        status: { notIn: [VisitStatus.Discharged, VisitStatus.COMPLETED] },
      },
      select: {
        id: true,
        patientId: true,
        createdAt: true,
        updatedAt: true,
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

    // Map all visits with bills (both paid and unpaid)
    const allBills = visits
      .filter((visit) => visit.bill) // Only include visits with bills
      .map((visit) => ({
        visitId: visit.id,
        patientId: visit.patientId,
        patientName: visit.patient ? `${visit.patient.firstName} ${visit.patient.lastName}` : 'Patient info missing',
        patientPhone: visit.patient?.phone ?? '',
        doctorName: visit.doctor?.name || 'Unknown',
        bill: visit.bill,
        visitDate: visit.createdAt,
        completedAt: visit.updatedAt,
      }))

    return NextResponse.json({
      success: true,
      bills: allBills,
    })
  } catch (error: any) {
    console.error('❌ Error fetching all bills:', error)
    // For Accountant/Admin dashboards, return empty list instead of 500
    return NextResponse.json({
      success: false,
      bills: [],
    })
  }
}

