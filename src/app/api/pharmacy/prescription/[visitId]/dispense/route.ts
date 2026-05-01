import { NextRequest, NextResponse } from 'next/server'
import { VisitStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getMedicationAllergyConflicts } from '@/lib/pharmacySafety'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// POST /api/pharmacy/prescription/[visitId]/dispense
// Marks prescription as dispensed, adds medication prices to invoice, updates visit status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['PHARMACIST', 'ADMIN'].includes(user.role)) return forbidden()

    const { visitId } = await params
    const body = await request.json()
    const { medicationPrices } = body // Array of { medicineName, price }

    // Find visit and related data
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        patient: true,
        bill: true,
      },
    })

    if (!visit) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      )
    }

    if (!visit.prescription || visit.prescription.trim() === '') {
      return NextResponse.json(
        { error: 'No prescription found for this visit' },
        { status: 400 }
      )
    }

    const requestedMeds = Array.isArray(medicationPrices)
      ? medicationPrices.map((med: { medicineName?: string }) => String(med?.medicineName || '').trim()).filter(Boolean)
      : []
    const allergyConflicts = getMedicationAllergyConflicts(requestedMeds, visit.patient?.allergies || null)
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

    // Get or create bill
    let bill = visit.bill
    if (!bill) {
      bill = await prisma.bill.create({
        data: {
          visitId: visit.id,
          patientId: visit.patientId,
          generatedBy: user.id,
          items: [],
          subtotal: 0,
          tax: 0,
          discount: 0,
          total: 0,
          paymentStatus: 'Pending',
        },
      })
    }

    // Parse prescription to get medication names
    const prescriptionLines = visit.prescription.split('\n').filter(l => l.trim())
    const currentItems = (bill.items as any[]) || []

    // Add medication items to invoice
    const newItems = medicationPrices.map((med: { medicineName: string; price: number }) => {
      // Find matching prescription line
      const matchingLine = prescriptionLines.find(line =>
        line.toLowerCase().includes(med.medicineName.toLowerCase())
      )

      return {
        department: 'Pharmacy',
        description: matchingLine || `${med.medicineName} - Medication`,
        quantity: 1,
        unitPrice: med.price,
        total: med.price,
        addedBy: user.id,
        addedAt: new Date().toISOString(),
      }
    })

    const allItems = [...currentItems, ...newItems]
    const subtotal = allItems.reduce((sum, item) => sum + (item.total || 0), 0)
    const total = subtotal + Number(bill.tax ?? 0) - Number(bill.discount ?? 0)

    // Update bill with new items
    await prisma.bill.update({
      where: { id: bill.id },
      data: {
        items: allItems,
        subtotal,
        total,
        updatedAt: new Date(),
      },
    })

    // Update visit status so patient appears in Accountant queue
    await prisma.visit.update({
      where: { id: visitId },
      data: {
        status: VisitStatus.Billing,
        notes: visit.notes
          ? `${visit.notes}\n[Pharmacy] Medications dispensed and added to invoice at ${new Date().toISOString()}`
          : `[Pharmacy] Medications dispensed and added to invoice at ${new Date().toISOString()}`,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Medications dispensed and added to invoice',
      billId: bill.id,
      totalItems: allItems.length,
    })
  } catch (error) {
    console.error('❌ Error dispensing prescription:', error)
    return NextResponse.json(
      { error: 'Failed to dispense prescription' },
      { status: 500 }
    )
  }
}

