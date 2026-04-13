import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MedicationOrderStatus } from '@prisma/client'

// POST /api/pharmacy/orders/[orderId]/out-of-stock
// Mark order as Out of Stock — triggers alert on Doctor and Nurse dashboards for that bed/visit.
export async function POST(
  _request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId

    const order = await prisma.medicationOrder.findUnique({
      where: { id: orderId },
      include: { visit: true },
    })

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.status === MedicationOrderStatus.DISPENSED) {
      return NextResponse.json({ error: 'Cannot mark dispensed order as out of stock' }, { status: 400 })
    }

    await prisma.medicationOrder.update({
      where: { id: orderId },
      data: {
        status: MedicationOrderStatus.OUT_OF_STOCK,
        outOfStockAt: new Date(),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Marked out of stock. Doctor and Nurse will see the alert.',
    })
  } catch (e) {
    console.error('Out of stock mark error:', e)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
