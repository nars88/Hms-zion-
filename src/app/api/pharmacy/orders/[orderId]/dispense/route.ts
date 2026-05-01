import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MedicationOrderStatus, VisitStatus } from '@prisma/client'
import { getMedicationAllergyConflicts } from '@/lib/pharmacySafety'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

type OrderItem = {
  medicationId?: string
  medicineName?: string
  dosage?: string
  quantity?: number
  unitPrice?: number
  totalPrice?: number
}

// POST /api/pharmacy/orders/[orderId]/dispense
// Atomic: validate stock, deduct inventory, set DISPENSED, add invoice items. Visit must not be closed.
// ARCHIVE ONLY: prescription/order record is never deleted; status is updated to DISPENSED for history/reports.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['PHARMACIST', 'ADMIN'].includes(user.role)) return forbidden()

    const { orderId } = await params
    const body = (await request.json().catch(() => ({}))) as {
      selectedItems?: Array<{ medicineName?: string; medication?: string; dosage?: string; quantity?: number }>
    }

    if (!orderId || typeof orderId !== 'string' || orderId.trim().length < 8) {
      return NextResponse.json(
        {
          error: 'Invalid orderId format',
          details: { orderId: orderId ?? null },
        },
        { status: 400 }
      )
    }

    const normalizedOrderId = orderId.trim()

    const order = await prisma.medicationOrder.findUnique({
      where: { id: normalizedOrderId },
      select: {
        id: true,
        status: true,
        items: true,
        visit: {
          select: {
            id: true,
            patientId: true,
            doctorId: true,
            status: true,
            bill: true,
            patient: {
              select: {
                allergies: true,
              },
            },
          },
        },
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
    const rawOrderItems =
      payloadItems.length > 0
        ? payloadItems.map((i) => ({
            medicationId: '',
            medicineName: String(i.medicineName || i.medication || '').trim(),
            dosage: String(i.dosage || '').trim(),
            quantity: Number(i.quantity) || 1,
          }))
        : ((order.items as OrderItem[]) || [])
    if (rawOrderItems.length === 0) {
      return NextResponse.json({ error: 'Order has no items' }, { status: 400 })
    }
    // Group same medication into one line and sum quantity.
    const grouped = new Map<string, OrderItem>()
    for (const item of rawOrderItems) {
      const key = [
        String(item.medicationId || item.medicineName || '').toLowerCase(),
        String(item.dosage || '').toLowerCase(),
      ].join('|')
      const existing = grouped.get(key)
      if (!existing) {
        grouped.set(key, { ...item, quantity: Math.max(1, Number(item.quantity) || 1) })
        continue
      }
      existing.quantity = Math.max(1, Number(existing.quantity) || 1) + Math.max(1, Number(item.quantity) || 1)
    }
    const orderItems = Array.from(grouped.values())

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

    type Resolved = {
      item: OrderItem
      inv: { id: string; drugName: string; currentStock: number; pricePerUnit: unknown } | null
      qty: number
    }
    const resolved: Resolved[] = []
    for (const item of orderItems) {
      const name = (item.medicineName || '').trim()
      const qty = Math.max(1, Number(item.quantity) || 1)
      const inv = findInventoryMatch(name)
      if (!inv) {
        // Workflow bypass for "N/A stock": allow dispensing and billing even when inventory entry does not exist.
        resolved.push({ item, inv: null, qty })
        continue
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
      const fallbackUnitPrice = Number(item.unitPrice || 0)
      const unitPriceRaw = inv ? Number(inv.pricePerUnit) : fallbackUnitPrice
      const unitPrice = Number.isFinite(unitPriceRaw) ? unitPriceRaw : 0
      const total = unitPrice * qty
      return {
        department: 'Pharmacy',
        description: `${item.medicineName || inv?.drugName || 'Medication'} ${(item.dosage || '').trim()}`.trim(),
        quantity: qty,
        unitPrice,
        total,
      }
    })
    const allItems = [...existingItems, ...newBillItems]
    const subtotal = allItems.reduce((s, i) => s + (Number(i.total) || 0), 0)
    const total = subtotal + Number(bill.tax) - Number(bill.discount)
    const totalCost = newBillItems.reduce((s, i) => s + (Number(i.total) || 0), 0)

    const updatedOrderItems = resolved.map(({ item, inv, qty }) => {
      const fallbackUnitPrice = Number(item.unitPrice || 0)
      const unitPriceRaw = inv ? Number(inv.pricePerUnit) : fallbackUnitPrice
      const unitPrice = Number.isFinite(unitPriceRaw) ? unitPriceRaw : 0
      return {
      medicineName: item.medicineName || inv?.drugName || 'Medication',
      dosage: item.dosage,
      quantity: qty,
      unitPrice,
      totalPrice: unitPrice * qty,
    }
    })

    await prisma.$transaction([
      ...resolved
        .filter((row) => row.inv)
        .map(({ inv, qty }) =>
        prisma.inventory.update({
          where: { id: inv!.id },
          data: { currentStock: inv!.currentStock - qty, updatedAt: new Date() },
        })
      ),
      prisma.medicationOrder.update({
        where: { id: normalizedOrderId },
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
    const err = e as Error & { code?: string; meta?: unknown }
    console.error('Dispense error:', {
      message: err?.message,
      code: err?.code,
      meta: err?.meta,
      stack: err?.stack,
    })
    return NextResponse.json(
      {
        error: err?.message || 'Failed to dispense',
        code: err?.code || 'DISPENSE_INTERNAL_ERROR',
        meta: err?.meta ?? null,
      },
      { status: 500 }
    )
  }
}
