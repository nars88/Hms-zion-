import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface VitalsBody {
  patientId: string
  visitId: string
  bp: string
  temperature: number
  heartRate: number
  weight: number
  allergies: string
  triageLevel: number
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VitalsBody
    const {
      patientId,
      visitId,
      bp,
      temperature,
      heartRate,
      weight,
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

    // Create vitals record
    await prisma.vitals.create({
      data: {
        patientId,
        visitId,
        bp,
        temperature,
        heartRate,
        weight,
      },
    })

    // Update patient snapshot with allergies & triage level
    await prisma.patient.update({
      where: { id: patientId },
      data: {
        allergies,
        triageLevel,
      },
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('❌ Error saving vitals for intake:', error)
    return NextResponse.json(
      { error: 'Failed to save vitals.' },
      { status: 500 }
    )
  }
}


