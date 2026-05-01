import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestUser, forbidden, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

interface VitalsBody {
  patientId: string
  visitId: string
  bp: string
  temperature: number
  heartRate: number
  weight: number
  oxygen?: number
  allergies: string
  triageLevel: number
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['INTAKE_NURSE', 'ER_INTAKE_NURSE', 'ER_NURSE', 'ADMIN'].includes(user.role)) return forbidden()

    const body = (await request.json()) as VitalsBody
    const {
      patientId,
      visitId,
      bp,
      temperature,
      heartRate,
      weight,
      oxygen,
      allergies,
      triageLevel,
    } = body

    if (
      !patientId ||
      !visitId ||
      !bp ||
      !Number.isFinite(temperature) ||
      !Number.isFinite(heartRate) ||
      !Number.isFinite(weight) ||
      !allergies ||
      !triageLevel
    ) {
      return NextResponse.json(
        { error: 'All vitals, allergies, and triageLevel are required.' },
        { status: 400 }
      )
    }

    if (triageLevel < 1 || triageLevel > 5) {
      return NextResponse.json(
        { error: 'triageLevel must be between 1 and 5.' },
        { status: 400 }
      )
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

    // Ensure visit belongs to patient
    const visit = await prisma.visit.findFirst({
      where: {
        id: visitId,
        patientId,
      },
    })

    if (!visit) {
      return NextResponse.json(
        { error: 'Visit not found for this patient.' },
        { status: 404 }
      )
    }

    // Create vitals record and update visit snapshot in one transaction.
    await prisma.$transaction(async (tx) => {
      await tx.vitals.create({
        data: {
          patientId,
          visitId,
          bp,
          temperature,
          heartRate,
          weight,
          recordedBy: user.id,
        },
      })

      // Keep visit in Waiting so it appears in doctor queue, but mark intake completion.
      const intakeSnapshot = {
        intakeCompletedAt: new Date().toISOString(),
        intakeCompletedBy: user.id,
        oxygen: oxygen ?? null,
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
        data: {
          status: visit.status,
          notes: nextNotes,
        },
      })

      // Update patient snapshot with allergies & triage level.
      await tx.patient.update({
        where: { id: patientId },
        data: {
          allergies,
          triageLevel,
        },
      })
    })

    return NextResponse.json({ success: true, transitionedToDoctorQueue: true }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to save vitals.' },
      { status: 500 }
    )
  }
}


