import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MedicationOrderStatus, VisitStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

type OrderItem = { medicineName?: string; dosage?: string; quantity?: number; unitPrice?: number; totalPrice?: number }

// POST /api/pharmacy/orders/[orderId]/dispense
// Atomic: validate stock, deduct inventory, set DISPENSED, add invoice items. Visit must not be closed.
// ARCHIVE ONLY: prescription/order record is never deleted; status is updated to DISPENSED for history/reports.
export async function POST(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const orderId = params.orderId

    const order = await prisma.medicationOrder.findUnique({
      where: { id: orderId },
      include: {
        visit: { include: { bill: true, patient: true } },
      },
    })

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.status === MedicationOrderStatus.DISPENSED) {
      return NextResponse.json({ error: 'Order already dispensed' }, { status: 400 })
    }

    const visit = order.visit
    if (visit.status === VisitStatus.Discharged || visit.status === VisitStatus.COMPLETED) {
      return NextResponse.json(
        { error: 'Visit is closed. No more stock can be dispensed to this visit.' },
        { status: 400 }
      )
    }

    const orderItems = (order.items as OrderItem[]) || []
    if (orderItems.length === 0) {
      return NextResponse.json({ error: 'Order has no items' }, { status: 400 })
    }

    const allInventory = await prisma.inventory.findMany({
      where: { deletedAt: null },
    })

    const drugNameMatch = (inv: { drugName: string }, name: string) => {
      const n = (name || '').toLowerCase().trim()
      const d = inv.drugName.toLowerCase().trim()
      return d === n || n.includes(d) || d.includes(n)
    }

    type Resolved = { item: OrderItem; inv: (typeof allInventory)[0]; qty: number }
    const resolved: Resolved[] = []
    for (const item of orderItems) {
      const name = (item.medicineName || '').trim()
      const qty = Math.max(1, Number(item.quantity) || 1)
      const inv = allInventory.find((i) => drugNameMatch(i, name))
      if (!inv) {
        return NextResponse.json(
          { error: `Insufficient Stock: "${name}" not found in inventory. Add the drug to inventory first.` },
          { status: 400 }
        )
      }
      if (inv.currentStock < qty) {
        return NextResponse.json(
          { error: `Insufficient Stock: "${inv.drugName}". Available: ${inv.currentStock}, Requested: ${qty}` },
          { status: 400 }
        )
      }
      resolved.push({ item, inv, qty })
    }

    let bill = visit.bill
    if (!bill) {
      bill = await prisma.bill.create({
        data: {
          visitId: visit.id,
          patientId: visit.patientId,
          generatedBy: 'system',
          items: [],
          subtotal: 0,
          tax: 0,
          discount: 0,
          total: 0,
          paymentStatus: 'Pending',
        },
      })
    }

    const existingItems = (bill.items as Array<{ department?: string; description?: string; quantity?: number; unitPrice?: number; total?: number }>) || []
    const newBillItems = resolved.map(({ item, inv, qty }) => {
      const unitPrice = Number(inv.pricePerUnit)
      const total = unitPrice * qty
      return {
        department: 'Pharmacy',
        description: `${item.medicineName || inv.drugName} ${(item.dosage || '').trim()}`.trim() || inv.drugName,
        quantity: qty,
        unitPrice,
        total,
      }
    })
    const allItems = [...existingItems, ...newBillItems]
    const subtotal = allItems.reduce((s, i) => s + (Number(i.total) || 0), 0)
    const total = subtotal + Number(bill.tax) - Number(bill.discount)
    const totalCost = newBillItems.reduce((s, i) => s + (Number(i.total) || 0), 0)

    const updatedOrderItems = resolved.map(({ item, inv, qty }) => ({
      medicineName: item.medicineName || inv.drugName,
      dosage: item.dosage,
      quantity: qty,
      unitPrice: Number(inv.pricePerUnit),
      totalPrice: Number(inv.pricePerUnit) * qty,
    }))

    await prisma.$transaction([
      ...resolved.map(({ inv, qty }) =>
        prisma.inventory.update({
          where: { id: inv.id },
          data: { currentStock: inv.currentStock - qty, updatedAt: new Date() },
        })
      ),
      prisma.medicationOrder.update({
        where: { id: orderId },
        data: {
          status: MedicationOrderStatus.DISPENSED,
          totalCost,
          items: updatedOrderItems,
          dispensedAt: new Date(),
          outOfStockAt: null,
          updatedAt: new Date(),
        },
      }),
      prisma.bill.update({
        where: { id: bill.id },
        data: {
          items: allItems,
          subtotal,
          total,
          updatedAt: new Date(),
        },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: 'Dispensed. Medication cost added to visit invoice.',
      totalAdded: totalCost,
    })
  } catch (e) {
    console.error('Dispense error:', e)
    return NextResponse.json({ error: 'Failed to dispense' }, { status: 500 })
  }
}
