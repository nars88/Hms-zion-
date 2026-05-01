import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MedicationOrderStatus, VisitStatus } from '@prisma/client'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// POST /api/pharmacy/orders/[orderId]/close
// Close the order without dispensing (patient declined / end visit).
// ARCHIVE ONLY: prescription/order is never deleted; status is updated to CLOSED for history/reports.
// Doctor and Pharmacist can view these records later in Patient History or Reports.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['PHARMACIST', 'ADMIN'].includes(user.role)) return forbidden()

    const { orderId } = await params

    const order = await prisma.medicationOrder.findUnique({
      where: { id: orderId },
      include: {
        visit: { include: { bill: true } },
      },
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

    if (order.visit.bill) {
      const existingItems = (order.visit.bill.items as Array<{ department?: string; total?: number }>) || []
      const keptItems = existingItems.filter((it) => String(it.department || '').toLowerCase() !== 'pharmacy')
      const subtotal = keptItems.reduce((sum, it) => sum + (Number(it.total) || 0), 0)
      const total = subtotal + Number(order.visit.bill.tax ?? 0) - Number(order.visit.bill.discount ?? 0)
      await prisma.$transaction([
        prisma.medicationOrder.update({
          where: { id: orderId },
          data: { status: MedicationOrderStatus.CLOSED },
        }),
        prisma.visit.update({
          where: { id: order.visitId },
          data: { status: VisitStatus.Billing, updatedAt: new Date() },
        }),
        prisma.bill.update({
          where: { id: order.visit.bill.id },
          data: {
            items: keptItems,
            subtotal,
            total,
            qrStatus: 'LOCKED',
            updatedAt: new Date(),
          },
        }),
      ])
    } else {
      await prisma.$transaction([
        prisma.medicationOrder.update({
          where: { id: orderId },
          data: { status: MedicationOrderStatus.CLOSED },
        }),
        prisma.visit.update({
          where: { id: order.visitId },
          data: { status: VisitStatus.Billing, updatedAt: new Date() },
        }),
      ])
    }

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
