import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import { getRequestUser, forbidden, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

type Body = {
  patientId?: string
  doctorName?: string
  appointmentDate?: string
  appointmentTime?: string
}

function mergeNotes(existing: string | null, patch: Record<string, unknown>) {
  let parsed: Record<string, unknown> = {}
  try {
    if (existing) parsed = JSON.parse(existing) as Record<string, unknown>
  } catch {
    parsed = {}
  }
  return JSON.stringify({ ...parsed, ...patch })
}

// POST /api/reception/clinic-booking
// Silent backend save for Step 2 doctor selection (no UI flow changes)
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['RECEPTIONIST', 'SECRETARY', 'ADMIN'].includes(user.role)) return forbidden()

    const body = (await request.json().catch(() => ({}))) as Body
    const patientId = (body.patientId || '').trim()
    const doctorName = (body.doctorName || '').trim()
    const appointmentDate = (body.appointmentDate || '').trim()
    const appointmentTime = (body.appointmentTime || '').trim()

    if (!patientId || !doctorName || !appointmentDate || !appointmentTime) {
      return NextResponse.json(
        { error: 'patientId, doctorName, appointmentDate and appointmentTime are required' },
        { status: 400 }
      )
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const notes = mergeNotes(null, {
      visitType: 'CLINIC',
      assignedDoctor: doctorName,
      appointmentDate,
      appointmentTime,
      registrationSource: 'RECEPTION_STEP2',
      bookedByUserId: user.id,
      bookedByRole: user.role,
      createdAt: new Date().toISOString(),
    })

    const visit = await prisma.visit.create({
      data: {
        patientId,
        status: VisitStatus.Waiting,
        chiefComplaint: 'Clinic appointment',
        notes,
      },
      select: { id: true, status: true },
    })

    return NextResponse.json({ success: true, visit })
  } catch (e: unknown) {
    const err = e as Error
    console.error('Error creating clinic booking visit:', err)
    return NextResponse.json({ error: err?.message || 'Failed to create clinic booking' }, { status: 500 })
  }
}
