import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

// GET /api/visits/[visitId]
// Get visit details including follow-up status
export async function GET(
  request: Request,
  { params }: { params: { visitId: string } }
) {
  try {
    const visit = await prisma.visit.findUnique({
      where: { id: params.visitId },
      include: {
        patient: true,
        doctor: true,
      },
    })

    if (!visit) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      visit,
    })
  } catch (error: any) {
    console.error('❌ Error fetching visit:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch visit' },
      { status: 500 }
    )
  }
}

// PATCH /api/visits/[visitId] - update status and/or chiefComplaint, notes
export async function PATCH(
  request: Request,
  { params }: { params: { visitId: string } }
) {
  try {
    const body = await request.json()
    const { status, chiefComplaint, notes } = body
    const data: { status?: VisitStatus; chiefComplaint?: string; notes?: string; updatedAt: Date } = { updatedAt: new Date() }
    if (status !== undefined) {
      const valid = Object.values(VisitStatus).includes(status)
      if (!valid) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      data.status = status as VisitStatus
    }
    if (chiefComplaint !== undefined) data.chiefComplaint = chiefComplaint
    if (notes !== undefined) data.notes = notes
    const visit = await prisma.visit.update({
      where: { id: params.visitId },
      data,
    })
    return NextResponse.json({ success: true, visit })
  } catch (error: any) {
    console.error('❌ Error updating visit:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update visit' },
      { status: 500 }
    )
  }
}

