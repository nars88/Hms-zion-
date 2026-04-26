import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import { getRequestUser, unauthorized, forbidden } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

const visitSelect = {
  id: true,
  patientId: true,
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

type ResultRow = { releasedToDoctorAt?: string }

function parseVisitNotes(notes: string | null): Record<string, unknown> {
  if (!notes) return {}
  try {
    const parsed = JSON.parse(notes) as Record<string, unknown>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function hasReleasedResult(rows: unknown): boolean {
  if (!Array.isArray(rows)) return false
  return rows.some((r) => Boolean((r as ResultRow)?.releasedToDoctorAt))
}

function isEmergencyVitals(vitals: VisitRow['vitals'][number] | undefined): boolean {
  if (!vitals) return false
  if (typeof vitals.temperature === 'number' && vitals.temperature > 38.5) return true
  const bp = String(vitals.bp || '').trim()
  const m = bp.match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/)
  if (!m) return false
  const systolic = Number(m[1])
  const diastolic = Number(m[2])
  if (!Number.isFinite(systolic) || !Number.isFinite(diastolic)) return false
  return systolic >= 180 || systolic <= 90 || diastolic >= 120 || diastolic <= 60
}

function mapVisitToQueueItem(v: VisitRow) {
  if (!v.patient) return null
  const p = v.patient
  const latestVitals = v.vitals[0]
  const parsedNotes = parseVisitNotes(v.notes)
  const hasReadyResults =
    hasReleasedResult(parsedNotes.labResults) ||
    hasReleasedResult(parsedNotes.radiologyResults) ||
    hasReleasedResult(parsedNotes.sonarResults)
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
  const urgencyLevel =
    p.triageLevel != null && p.triageLevel <= 2
      ? 'EMERGENCY'
      : isEmergencyVitals(latestVitals)
        ? 'EMERGENCY'
        : p.triageLevel === 3
          ? 'MODERATE'
          : 'NORMAL'
  const workflowStatus =
    v.status === VisitStatus.READY_FOR_REVIEW || hasReadyResults
      ? 'RESULTS_READY'
      : v.status === VisitStatus.OUT_FOR_TEST
        ? 'WAITING_RESULTS'
        : v.status === VisitStatus.In_Consultation
          ? 'IN_CONSULTATION'
          : 'WAITING_EXAM'

  return {
    visitId: v.id,
    patientId: p.id,
    name: `${p.firstName} ${p.lastName}`.trim(),
    age,
    gender: p.gender,
    phone: p.phone,
    chiefComplaint: v.chiefComplaint,
    waitingSince: v.visitDate,
    triageLevel: p.triageLevel,
    allergies: p.allergies,
    urgencyLevel,
    workflowStatus,
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

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['DOCTOR', 'ADMIN'].includes(user.role)) return forbidden()

    // Waiting for doctor / nurse workup: vitals, ER chief complaint, or any checked-in visit with a complaint (clinic).
    const waitingWhere = {
      status: VisitStatus.Waiting,
      OR: [{ vitals: { some: {} } }, { chiefComplaint: { not: null } }],
    }

    const [waitingVisits, outForTestVisits, readyForReviewVisits, inProgressVisits] = await Promise.all([
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
          status: VisitStatus.OUT_FOR_TEST,
        },
        orderBy: { updatedAt: 'asc' },
        select: visitSelect,
      }),
      prisma.visit.findMany({
        where: {
          status: VisitStatus.READY_FOR_REVIEW,
        },
        orderBy: { updatedAt: 'asc' },
        select: visitSelect,
      }),
      prisma.visit.findMany({
        where: {
          status: VisitStatus.In_Consultation,
        },
        orderBy: { updatedAt: 'desc' },
        select: visitSelect,
      }),
    ])

    const queue = [...waitingVisits, ...outForTestVisits].map(mapVisitToQueueItem).filter(Boolean)
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
