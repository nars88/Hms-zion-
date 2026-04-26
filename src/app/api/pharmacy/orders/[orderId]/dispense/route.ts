import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MedicationOrderStatus, VisitStatus } from '@prisma/client'
import { getMedicationAllergyConflicts } from '@/lib/pharmacySafety'

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
    const body = (await request.json().catch(() => ({}))) as {
      selectedItems?: Array<{ medicineName?: string; medication?: string; dosage?: string; quantity?: number }>
    }

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

    const payloadItems = Array.isArray(body.selectedItems) ? body.selectedItems : []
    const orderItems =
      payloadItems.length > 0
        ? payloadItems.map((i) => ({
            medicineName: String(i.medicineName || i.medication || '').trim(),
            dosage: String(i.dosage || '').trim(),
            quantity: Number(i.quantity) || 1,
          }))
        : ((order.items as OrderItem[]) || [])
    if (orderItems.length === 0) {
      return NextResponse.json({ error: 'Order has no items' }, { status: 400 })
    }
    const medicationNames = orderItems.map((item) => String(item.medicineName || '').trim()).filter(Boolean)
    const allergyConflicts = getMedicationAllergyConflicts(medicationNames, visit.patient?.allergies || null)
    if (allergyConflicts.length > 0) {
      return NextResponse.json(
        {
          error: 'Cannot dispense due to allergy conflict.',
          status: 'Cannot dispense',
          conflicts: allergyConflicts,
          instruction: 'Verify with doctor',
        },
        { status: 409 }
      )
    }

    const allInventory = await prisma.inventory.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        drugName: true,
        currentStock: true,
        pricePerUnit: true,
      },
    })

    const normalizeDrugName = (value: string) =>
      String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\b\d+\s*(mg|ml|g|mcg|tabs?|tablets?|caps?|capsules?)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

    const findInventoryMatch = (medicineName: string) => {
      const n = normalizeDrugName(medicineName)
      return allInventory.find((inv) => {
        const d = normalizeDrugName(inv.drugName)
        return d === n || d.includes(n) || n.includes(d)
      })
    }

    type Resolved = { item: OrderItem; inv: { id: string; drugName: string; currentStock: number; pricePerUnit: unknown }; qty: number }
    const resolved: Resolved[] = []
    for (const item of orderItems) {
      const name = (item.medicineName || '').trim()
      const qty = Math.max(1, Number(item.quantity) || 1)
      const inv = findInventoryMatch(name)
      console.log('[Pharmacy Dispense] Stock check:', {
        orderId,
        requestedMedicine: name,
        requestedQty: qty,
        matchedInventoryDrug: inv?.drugName ?? null,
        availableStock: inv?.currentStock ?? 0,
      })
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
      const doctorUser = visit.doctorId
        ? await prisma.user.findUnique({
            where: { id: visit.doctorId },
            select: { id: true },
          })
        : null
      const fallbackUser = doctorUser
        ? null
        : await prisma.user.findFirst({
            select: { id: true },
            orderBy: { createdAt: 'asc' },
          })
      const generatedByUserId = doctorUser?.id || fallbackUser?.id
      if (!generatedByUserId) {
        return NextResponse.json(
          { error: 'Cannot generate bill: no valid billing user found.' },
          { status: 500 }
        )
      }

      bill = await prisma.bill.create({
        data: {
          visitId: visit.id,
          patientId: visit.patientId,
          generatedBy: generatedByUserId,
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
          paymentStatus: 'Pending',
          qrStatus: 'LOCKED',
          updatedAt: new Date(),
        },
      }),
      prisma.visit.update({
        where: { id: visit.id },
        data: {
          status: VisitStatus.Billing,
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
