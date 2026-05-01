import { NextResponse } from 'next/server'
import { VisitStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

type TriageBody = {
  patientId?: string
  visitId?: string
  bp?: string
  temperature?: number
  heartRate?: number
  spo2?: number
  weight?: number
  triagePriority?: 'RED' | 'YELLOW' | 'GREEN'
  bedNumber?: number
}

// POST /api/er/triage
// Records vitals and moves ER patient toward doctor review.
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['ER_INTAKE_NURSE', 'ADMIN'].includes(user.role)) return forbidden()

    const body = (await request.json()) as TriageBody
    if (!body.patientId || !body.visitId || !body.bp) {
      return NextResponse.json({ error: 'patientId, visitId and bp are required.' }, { status: 400 })
    }
    if (
      typeof body.temperature !== 'number' ||
      !Number.isFinite(body.temperature) ||
      typeof body.heartRate !== 'number' ||
      !Number.isFinite(body.heartRate) ||
      typeof body.spo2 !== 'number' ||
      !Number.isFinite(body.spo2)
    ) {
      return NextResponse.json({ error: 'temperature, heartRate and spo2 are required numbers.' }, { status: 400 })
    }
    const patientId = body.patientId
    const visitId = body.visitId
    const bp = body.bp.trim()
    const temperature = body.temperature
    const heartRate = Math.round(body.heartRate)
    const spo2 = body.spo2

    const priority = body.triagePriority || 'YELLOW'
    const notePatch = {
      triagePriority: priority,
      triagedAt: new Date().toISOString(),
      triagedBy: user.id,
    }

    const visit = await prisma.visit.findFirst({
      where: { id: visitId, patientId },
      select: { id: true, notes: true },
    })
    if (!visit) {
      return NextResponse.json({ error: 'Visit not found.' }, { status: 404 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const assignedBedNumber =
        typeof body.bedNumber === 'number' && Number.isFinite(body.bedNumber) && body.bedNumber > 0
          ? Math.trunc(body.bedNumber)
          : null

      await tx.vitals.create({
        data: {
          patientId,
          visitId,
          bp,
          temperature,
          heartRate,
          spo2,
          weight: typeof body.weight === 'number' && Number.isFinite(body.weight) ? body.weight : 0,
          recordedBy: user.id,
          recordingSource: 'ER-TRIAGE',
        },
      })

      let parsedNotes: Record<string, unknown> = {}
      try {
        parsedNotes = visit.notes ? (JSON.parse(visit.notes) as Record<string, unknown>) : {}
      } catch {
        parsedNotes = {}
      }

      const updatedVisit = await tx.visit.update({
        where: { id: visitId },
        data: {
          status: VisitStatus.WITH_DOCTOR,
          ...(assignedBedNumber != null ? { bedNumber: assignedBedNumber } : {}),
          notes: JSON.stringify({ ...parsedNotes, ...notePatch }),
          updatedAt: new Date(),
        },
        select: { id: true, status: true, bedNumber: true },
      })

      return updatedVisit
    })

    return NextResponse.json({ success: true, visit: result }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to submit triage.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
