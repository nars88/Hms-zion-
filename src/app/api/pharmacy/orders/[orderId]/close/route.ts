import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MedicationOrderStatus } from '@prisma/client'

// POST /api/pharmacy/orders/[orderId]/close
// Close the order without dispensing (patient declined / end visit).
// ARCHIVE ONLY: prescription/order is never deleted; status is updated to CLOSED for history/reports.
// Doctor and Pharmacist can view these records later in Patient History or Reports.
export async function POST(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId

    const order = await prisma.medicationOrder.findUnique({
      where: { id: orderId },
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.status === MedicationOrderStatus.DISPENSED) {
      return NextResponse.json(
        { error: 'Order already dispensed. Cannot close.' },
        { status: 400 }
      )
    }

    await prisma.medicationOrder.update({
      where: { id: orderId },
      data: { status: MedicationOrderStatus.CLOSED },
    })

    return NextResponse.json({
      success: true,
      message: 'Visit closed. Prescription retained in history.',
    })
  } catch (e) {
    console.error('Pharmacy order close error:', e)
    return NextResponse.json(
      { error: 'Failed to close order' },
      { status: 500 }
    )
  }
}
