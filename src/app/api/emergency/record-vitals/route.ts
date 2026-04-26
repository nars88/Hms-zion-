import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestUser, forbidden, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

/** ER-only vitals write: allows ER doctor + nurse + admin; visit must be an ER visit. */
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['DOCTOR', 'ADMIN', 'ER_NURSE', 'INTAKE_NURSE'].includes(user.role)) return forbidden()

    const body = (await request.json()) as {
      patientId?: string
      visitId?: string
      bp?: string
      temperature?: number
      heartRate?: number
      weight?: number
      oxygen?: number | null
      allergies?: string
      triageLevel?: number
    }

    const patientId = body.patientId
    const visitId = body.visitId
    const bp = body.bp
    const oxygen = body.oxygen
    const allergies = body.allergies
    const triageLevel = body.triageLevel

    if (
      !patientId ||
      !visitId ||
      !bp ||
      typeof body.temperature !== 'number' ||
      !Number.isFinite(body.temperature) ||
      typeof body.heartRate !== 'number' ||
      !Number.isFinite(body.heartRate) ||
      typeof body.weight !== 'number' ||
      !Number.isFinite(body.weight) ||
      !allergies ||
      triageLevel == null ||
      !Number.isFinite(triageLevel)
    ) {
      return NextResponse.json(
        { error: 'All vitals, allergies, and triageLevel are required.' },
        { status: 400 }
      )
    }

    const temperature = body.temperature
    const heartRate = Math.round(body.heartRate)
    const weight = body.weight

    if (triageLevel < 1 || triageLevel > 5) {
      return NextResponse.json({ error: 'triageLevel must be between 1 and 5.' }, { status: 400 })
    }

    const bpRegex = /^\d{2,3}\/\d{2,3}$/
    if (!bpRegex.test(bp.trim())) {
      return NextResponse.json(
        { error: "Blood pressure must include '/' and be in format like 120/80." },
        { status: 400 }
      )
    }

    if (temperature < 35 || temperature > 42) {
      return NextResponse.json(
        { error: 'Temperature must be between 35°C and 42°C.' },
        { status: 400 }
      )
    }

    if (oxygen != null && (!Number.isFinite(oxygen) || oxygen < 50 || oxygen > 100)) {
      return NextResponse.json(
        { error: 'Oxygen saturation must be between 50 and 100.' },
        { status: 400 }
      )
    }

    const visit = await prisma.visit.findFirst({
      where: {
        id: visitId,
        patientId,
        OR: [
          { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' } },
          { chiefComplaint: { contains: 'ER', mode: 'insensitive' } },
        ],
      },
    })

    if (!visit) {
      return NextResponse.json({ error: 'ER visit not found for this patient.' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.vitals.create({
        data: {
          patientId,
          visitId,
          bp: bp.trim(),
          temperature,
          heartRate,
          weight,
          recordedBy: user.id,
        },
      })

      const intakeSnapshot = {
        erTriageVitalsAt: new Date().toISOString(),
        erTriageVitalsBy: user.id,
        oxygen: oxygen ?? null,
        workflowStage: 'READY_FOR_DOCTOR' as const,
      }

      let nextNotes: string
      if (!visit.notes) {
        nextNotes = JSON.stringify(intakeSnapshot)
      } else {
        try {
          const parsed = JSON.parse(visit.notes)
          if (parsed && typeof parsed === 'object') {
            nextNotes = JSON.stringify({ ...parsed, ...intakeSnapshot })
          } else {
            nextNotes = JSON.stringify({ previousNotes: String(visit.notes), ...intakeSnapshot })
          }
        } catch {
          nextNotes = JSON.stringify({ previousNotes: String(visit.notes), ...intakeSnapshot })
        }
      }

      await tx.visit.update({
        where: { id: visitId },
        data: { notes: nextNotes },
      })

      await tx.patient.update({
        where: { id: patientId },
        data: {
          allergies: String(allergies).trim(),
          triageLevel,
        },
      })
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to save vitals.' }, { status: 500 })
  }
}
