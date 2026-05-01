import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MedicationOrderStatus } from '@prisma/client'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

async function resolveBillGeneratorId(preferredId?: string | null) {
  if (preferredId && preferredId.trim()) return preferredId.trim()
  const fallback = await prisma.user.findFirst({
    where: { role: { in: ['DOCTOR', 'ADMIN'] } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  return fallback?.id || ''
}

async function resolveMedicationPrice(medicineName: string, fallbackPrice = 0) {
  const clean = medicineName.trim()
  if (!clean) return fallbackPrice
  const direct = await prisma.inventory.findFirst({
    where: {
      drugName: { equals: clean, mode: 'insensitive' },
    },
    select: { pricePerUnit: true },
  })
  if (direct?.pricePerUnit != null) return Number(direct.pricePerUnit) || fallbackPrice
  const loose = await prisma.inventory.findFirst({
    where: { drugName: { contains: clean, mode: 'insensitive' } },
    select: { pricePerUnit: true },
  })
  if (loose?.pricePerUnit != null) return Number(loose.pricePerUnit) || fallbackPrice
  return fallbackPrice
}

// POST /api/doctor/visit/send-to-pharmacy
// Updates visit status to READY_FOR_PHARMACY and saves prescription
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['DOCTOR', 'ADMIN'].includes(user.role)) return forbidden()

    const body = await request.json()
    const { visitId, patientId, doctorId, prescriptionItems, diagnosis } = body

    if (!patientId || !doctorId) {
      return NextResponse.json(
        { error: 'Missing required fields: patientId, doctorId' },
        { status: 400 }
      )
    }

    if (!prescriptionItems || prescriptionItems.length === 0) {
      return NextResponse.json(
        { error: 'Prescription items are required' },
        { status: 400 }
      )
    }

    const visitRows = await prisma.$queryRawUnsafe<Array<{ id: string; doctorId: string | null }>>(
      `
      SELECT id, "doctorId"
      FROM visits
      WHERE "patientId" = $1
        AND ($2::text IS NULL OR id = $2::text)
      ORDER BY "createdAt" DESC
      LIMIT 1
      `,
      patientId,
      visitId && String(visitId).trim() ? String(visitId).trim() : null
    )
    const visit = visitRows[0]
    if (!visit?.id) {
      throw new Error('Failed to find or create visit for patient')
    }

    const normalizedItems = (prescriptionItems as Array<any>)
      .map((item, idx) => ({
        marker: `${Date.now()}-${idx}`,
        medicationId: String(item.medicationId || item.inventoryId || '').trim(),
        medicineName: String(item.medicineName || item.medicine || item.name || '').trim(),
        dosage: String(item.dosage || item.dose || '').trim(),
        frequency: String(item.frequency || item.instructions || item.notes || '').trim() || 'As prescribed',
        duration: String(item.duration || '').trim(),
        notes: String(item.notes || '').trim(),
        quantity: Math.max(1, Number(item.quantity) || 1),
        price: Number(item.price) || 0,
      }))
      .filter((item) => item.medicineName || item.dosage || item.frequency)

    if (normalizedItems.length === 0) {
      return NextResponse.json(
        { error: 'Prescription items are required' },
        { status: 400 }
      )
    }

    // Group by medicationId + strength(dosage) for medical safety.
    const groupedMap = new Map<
      string,
      {
        marker: string
        medicationId: string
        medicineName: string
        dosage: string
        frequency: string
        duration: string
        notes: string
        quantity: number
        price: number
      }
    >()
    for (const item of normalizedItems) {
      const key = [item.medicationId || item.medicineName.toLowerCase(), item.dosage.toLowerCase()].join('|')
      const existing = groupedMap.get(key)
      if (!existing) {
        groupedMap.set(key, { ...item })
        continue
      }
      existing.quantity += item.quantity
      if (!existing.notes && item.notes) existing.notes = item.notes
      if (!existing.medicationId && item.medicationId) existing.medicationId = item.medicationId
    }
    const groupedItems = Array.from(groupedMap.values())

    // Keep visit.prescription as readable text, sourced from grouped array
    const prescriptionText = groupedItems
      .map((item) => `${item.medicineName} x${item.quantity} ${item.dosage}`.trim() + ` - ${item.frequency}`)
      .join('\n')

    // Update visit status to READY_FOR_PHARMACY
    await prisma.$executeRawUnsafe(
      `
      UPDATE visits
      SET status = 'READY_FOR_PHARMACY'::"VisitStatus",
          "doctorId" = $2,
          diagnosis = $3,
          prescription = $4,
          "updatedAt" = $5
      WHERE id = $1
      `,
      visit.id,
      doctorId,
      diagnosis || null,
      prescriptionText || null,
      new Date()
    )

    // Create or update MedicationOrder (visit-based) for pharmacy feed
    const orderItems = groupedItems.map((item) => {
      const unitPrice = Number(item.price) || 0
      const qty = Math.max(1, Number(item.quantity) || 1)
      return {
      name: item.medicineName,
      dose: item.dosage,
      instructions: item.frequency,
      medicationId: item.medicationId || undefined,
      medicineName: item.medicineName,
      dosage: item.dosage,
      frequency: item.frequency,
      quantity: qty,
      unitPrice,
      totalPrice: unitPrice * qty,
      price: unitPrice,
      notes: item.notes || undefined,
    }})
    await prisma.medicationOrder.upsert({
      where: { visitId: visit.id },
      create: {
        visitId: visit.id,
        status: MedicationOrderStatus.PENDING,
        totalCost: 0,
        items: orderItems,
      },
      update: {
        status: MedicationOrderStatus.PENDING,
        totalCost: 0,
        items: orderItems,
        dispensedAt: null,
        outOfStockAt: null,
        updatedAt: new Date(),
      },
    })

    const generatedBy = await resolveBillGeneratorId(doctorId || visit.doctorId || null)
    if (!generatedBy) {
      return NextResponse.json({ error: 'No valid billing user available' }, { status: 500 })
    }

    let bill = await prisma.bill.findUnique({ where: { visitId: visit.id } })
    if (!bill) {
      bill = await prisma.bill.create({
        data: {
          visitId: visit.id,
          patientId: patientId,
          generatedBy,
          items: [],
          subtotal: 0,
          tax: 0,
          discount: 0,
          total: 0,
          paymentStatus: 'Pending',
        },
      })
    }

    const existingItems =
      (bill.items as Array<{ description?: string; total?: number; quantity?: number; unitPrice?: number; department?: string; addedAt?: string; addedBy?: string }>) || []
    const billAdditions: Array<{ department: string; description: string; quantity: number; unitPrice: number; total: number; addedAt: string; addedBy: string }> = []
    for (const item of groupedItems) {
      const marker = `[RX_REQUEST:${item.marker}]`
      if (existingItems.some((row) => String(row.description || '').includes(marker))) continue
      const resolvedPrice = await resolveMedicationPrice(item.medicineName, item.price)
      const qty = Math.max(1, Number(item.quantity) || 1)
      const descriptionText = `${item.medicineName} (${item.dosage || 'As prescribed'}) - ${item.frequency}${item.duration ? ` for ${item.duration}` : ''} ${marker}`
      billAdditions.push({
        department: 'Pharmacy',
        description: descriptionText,
        quantity: qty,
        unitPrice: resolvedPrice,
        total: resolvedPrice * qty,
        addedAt: new Date().toISOString(),
        addedBy: generatedBy,
      })
    }

    if (billAdditions.length > 0) {
      const nextItems = [...existingItems, ...billAdditions]
      const subtotal = nextItems.reduce<number>((sum, item) => sum + Number(item.total || 0), 0)
      const total = subtotal + Number(bill.tax ?? 0) - Number(bill.discount ?? 0)
      await prisma.bill.update({
        where: { id: bill.id },
        data: {
          items: nextItems,
          subtotal,
          total,
          updatedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      visit: { id: visit.id, status: 'READY_FOR_PHARMACY' },
      billedItems: groupedItems.length,
      message: 'Prescription sent to pharmacy successfully',
    })
  } catch (error: any) {
    console.error('❌ Error sending prescription to pharmacy:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to send prescription to pharmacy' },
      { status: 500 }
    )
  }
}

