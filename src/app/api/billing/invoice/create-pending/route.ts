import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/billing/invoice/create-pending
// Creates a pending invoice when booking is completed
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { visitId, patientId, patientName, status = 'Pending' } = body

    if (!visitId || !patientId || !patientName) {
      return NextResponse.json(
        { error: 'Missing required fields: visitId, patientId, patientName' },
        { status: 400 }
      )
    }

    // Check if invoice already exists
    const existingBill = await prisma.bill.findUnique({
      where: { visitId },
    })

    if (existingBill) {
      return NextResponse.json({
        success: true,
        message: 'Invoice already exists',
        bill: existingBill,
      })
    }

    // Note: follow-up flag can be stored in visit.notes JSON if needed; Visit model has no isFollowUp column.

    // Create pending invoice
    const bill = await prisma.bill.create({
      data: {
        visitId,
        patientId,
        generatedBy: 'system', // Will be updated when doctor starts visit
        items: [],
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        paymentStatus: status,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Pending invoice created',
      bill,
    })
  } catch (error: any) {
    console.error('❌ Error creating pending invoice:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create pending invoice' },
      { status: 500 }
    )
  }
}

