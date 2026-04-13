import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/billing/invoices/[id]/pay
// Marks invoice as paid and automatically updates QR status to CLEARED
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { paymentMethod } = body

    // Get current user (accountant)
    const userIdCookie = request.cookies.get('zionmed_auth_token')
    if (!userIdCookie?.value) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Find bill
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        visit: true,
      },
    })

    if (!bill) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Update bill: mark as paid and clear QR status
    const updatedBill = await prisma.bill.update({
      where: { id },
      data: {
        paymentStatus: 'Paid',
        paymentMethod: paymentMethod || 'Cash',
        qrStatus: 'CLEARED', // Automatically unlock exit gate
        paidAt: new Date(),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Invoice marked as paid. QR Status updated to CLEARED.',
      bill: updatedBill,
    })
  } catch (error) {
    console.error('❌ Error marking invoice as paid:', error)
    return NextResponse.json(
      { error: 'Failed to mark invoice as paid' },
      { status: 500 }
    )
  }
}

