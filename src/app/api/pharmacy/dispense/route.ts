import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// POST /api/pharmacy/dispense
// Marks prescription as dispensed and updates visit status to COMPLETED
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { visitId, patientId } = body

    if (!visitId || !patientId) {
      return NextResponse.json(
        { error: 'Missing required fields: visitId, patientId' },
        { status: 400 }
      )
    }

    // Find the visit
    const visit = await prisma.visit.findFirst({
      where: {
        id: visitId,
        patientId: patientId,
        status: VisitStatus.READY_FOR_PHARMACY,
      },
    })

    if (!visit) {
      return NextResponse.json(
        { error: 'Visit not found or already processed' },
        { status: 404 }
      )
    }

    // Update visit status to COMPLETED
    const updatedVisit = await prisma.visit.update({
      where: { id: visitId },
      data: {
        status: VisitStatus.COMPLETED,
        updatedAt: new Date(),
      },
    })

    // Note: Medication costs are added by the frontend via /api/billing/invoice/add-medications
    // This ensures we get actual prices from the inventory context

    return NextResponse.json({
      success: true,
      visit: updatedVisit,
      message: 'Prescription dispensed and visit completed successfully',
    })
  } catch (error: any) {
    console.error('❌ Error dispensing prescription:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to dispense prescription' },
      { status: 500 }
    )
  }
}

