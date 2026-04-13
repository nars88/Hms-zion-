import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// PATCH /api/patients/[patientId] - update triageLevel and/or allergies (e.g. after ER admission)
export async function PATCH(
  request: Request,
  { params }: { params: { patientId: string } }
) {
  try {
    const patientId = params.patientId
    if (!patientId) {
      return NextResponse.json({ error: 'Missing patientId' }, { status: 400 })
    }
    const body = await request.json()
    const { triageLevel, allergies } = body
    const data: { triageLevel?: number; allergies?: string } = {}
    if (triageLevel !== undefined) {
      const level = Number(triageLevel)
      if (!Number.isInteger(level) || level < 1 || level > 5) {
        return NextResponse.json(
          { error: 'triageLevel must be an integer between 1 and 5' },
          { status: 400 }
        )
      }
      data.triageLevel = level
    }
    if (allergies !== undefined) data.allergies = allergies
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Provide triageLevel and/or allergies' }, { status: 400 })
    }
    const patient = await prisma.patient.update({
      where: { id: patientId },
      data,
    })
    return NextResponse.json({ success: true, patient })
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }
    console.error('Error updating patient:', e)
    return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 })
  }
}
