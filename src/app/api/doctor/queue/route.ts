import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

const visitSelect = {
  id: true,
  visitDate: true,
  chiefComplaint: true,
  notes: true,
  prescription: true,
  status: true,
  bill: { select: { paymentStatus: true } },
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      gender: true,
      dateOfBirth: true,
      phone: true,
      allergies: true,
      triageLevel: true,
    },
  },
  vitals: {
    orderBy: { recordedAt: 'desc' as const },
    take: 1,
  },
}

type VisitRow = Awaited<ReturnType<typeof prisma.visit.findMany<{ select: typeof visitSelect }>>>[number]

function mapVisitToQueueItem(v: VisitRow) {
  if (!v.patient) return null
  const p = v.patient
  const latestVitals = v.vitals[0]
  let age: number | null = null
  if (p.dateOfBirth) {
    const today = new Date()
    const dob = new Date(p.dateOfBirth)
    let a = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) a--
    age = a
  }
  const isEr = (v.chiefComplaint || '').toLowerCase().includes('emergency') || (v.chiefComplaint || '').toLowerCase().includes('er')
  const billPaid = (v.bill as { paymentStatus?: string })?.paymentStatus === 'Paid'
  const medsDispensed = (v.notes || '').includes('Medications dispensed') || (v.notes || '').includes('dispensed')
  return {
    visitId: v.id,
    patientId: p.id,
    name: `${p.firstName} ${p.lastName}`.trim(),
    age,
    gender: p.gender,
    phone: p.phone,
    chiefComplaint: v.chiefComplaint,
    triageLevel: p.triageLevel,
    allergies: p.allergies,
    vitals: latestVitals
      ? {
          bp: latestVitals.bp,
          temperature: latestVitals.temperature,
          heartRate: latestVitals.heartRate,
          weight: latestVitals.weight,
        }
      : null,
    ...(isEr && { billStatus: billPaid ? 'Paid' : 'Pending', medsReady: medsDispensed }),
  }
}

export async function GET() {
  try {
    // Waiting for doctor / nurse workup: vitals, ER chief complaint, or any checked-in visit with a complaint (clinic).
    const waitingWhere = {
      status: VisitStatus.Waiting,
      NOT: {
        OR: [
          { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' as const } },
          { chiefComplaint: { contains: 'ER', mode: 'insensitive' as const } },
        ],
      },
      OR: [
        { vitals: { some: {} } },
        { chiefComplaint: { not: null } },
      ],
    }

    const [waitingVisits, readyForReviewVisits, inProgressVisits] = await Promise.all([
      prisma.visit.findMany({
        where: waitingWhere,
        orderBy: [
          { patient: { triageLevel: 'asc' } },
          { visitDate: 'asc' },
        ],
        select: visitSelect,
      }),
      prisma.visit.findMany({
        where: {
          status: VisitStatus.READY_FOR_REVIEW,
          NOT: {
            OR: [
              { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' as const } },
              { chiefComplaint: { contains: 'ER', mode: 'insensitive' as const } },
            ],
          },
        },
        orderBy: { updatedAt: 'asc' },
        select: visitSelect,
      }),
      prisma.visit.findMany({
        where: {
          status: VisitStatus.In_Consultation,
          NOT: {
            OR: [
              { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' as const } },
              { chiefComplaint: { contains: 'ER', mode: 'insensitive' as const } },
            ],
          },
        },
        orderBy: { updatedAt: 'desc' },
        select: visitSelect,
      }),
    ])

    const queue = waitingVisits.map(mapVisitToQueueItem).filter(Boolean)
    const readyForReview = readyForReviewVisits.map(mapVisitToQueueItem).filter(Boolean)
    const inProgress = inProgressVisits.map(mapVisitToQueueItem).filter(Boolean)

    return NextResponse.json({ queue, readyForReview, inProgress })
  } catch (error) {
    console.error('❌ Error fetching doctor queue:', error)
    return NextResponse.json(
      { error: 'Failed to fetch doctor queue.' },
      { status: 500 }
    )
  }
}
