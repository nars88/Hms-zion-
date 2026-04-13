import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/pharmacy/prescription/[visitId]/dispense
// Marks prescription as dispensed, adds medication prices to invoice, updates visit status
export async function POST(
  request: NextRequest,
  { params }: { params: { visitId: string } }
) {
  try {
    const { visitId } = params
    const body = await request.json()
    const { medicationPrices } = body // Array of { medicineName, price }

    // Get current user (pharmacist)
    const userIdCookie = request.cookies.get('zionmed_auth_token')
    if (!userIdCookie?.value) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

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

    // Get or create bill
    let bill = visit.bill
    if (!bill) {
      bill = await prisma.bill.create({
        data: {
          visitId: visit.id,
          patientId: visit.patientId,
          generatedBy: userIdCookie.value,
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
        addedBy: userIdCookie.value,
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

    // Update visit status to indicate medication is ready
    // We can add a new status or use notes field, for now we'll add a note
    await prisma.visit.update({
      where: { id: visitId },
      data: {
        notes: visit.notes
          ? `${visit.notes}\n[Pharmacy] Medications dispensed and ready for pickup at ${new Date().toISOString()}`
          : `[Pharmacy] Medications dispensed and ready for pickup at ${new Date().toISOString()}`,
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

