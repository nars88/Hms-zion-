import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/billing/invoice/add-medications
// Adds medication items to the bill/invoice
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { visitId, patientId, medications, addedBy } = body

    if (!visitId || !patientId || !medications || !Array.isArray(medications)) {
      return NextResponse.json(
        { error: 'Missing required fields: visitId, patientId, medications' },
        { status: 400 }
      )
    }

    // Find or create bill
    let bill = await prisma.bill.findUnique({
      where: { visitId },
    })

    const items = bill ? (bill.items as any[]) : []
    
    // Check if medication items already exist
    const hasMedicationItems = items.some(
      (item: any) => item.department === 'Pharmacy'
    )

    if (!hasMedicationItems) {
      // Add medication items to bill
      const medicationItems = medications.map((med: any) => ({
        department: 'Pharmacy',
        description: `${med.medicineName} (${med.dosage || 'As prescribed'})`,
        quantity: med.quantity || 1,
        unitPrice: med.price || 10000,
        total: (med.price || 10000) * (med.quantity || 1),
        addedAt: new Date().toISOString(),
        addedBy: addedBy || 'pharmacy',
      }))

      const updatedItems = [...items, ...medicationItems]
      const medicationTotal = medicationItems.reduce((sum: number, item: any) => sum + item.total, 0)
      const subtotal = updatedItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0)
      const newTotal = subtotal + Number(bill?.tax ?? 0) - Number(bill?.discount ?? 0)

      if (bill) {
        bill = await prisma.bill.update({
          where: { id: bill.id },
          data: {
            items: updatedItems,
            subtotal: subtotal,
            total: newTotal,
            updatedAt: new Date(),
          },
        })
      } else {
        bill = await prisma.bill.create({
          data: {
            visitId,
            patientId,
            generatedBy: addedBy || 'pharmacy',
            items: medicationItems,
            subtotal: medicationTotal,
            tax: 0,
            discount: 0,
            total: medicationTotal,
            paymentStatus: 'Pending',
          },
        })
      }
    }

    return NextResponse.json({
      success: true,
      bill,
      message: 'Medications added to invoice successfully',
    })
  } catch (error: any) {
    console.error('❌ Error adding medications to invoice:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to add medications to invoice' },
      { status: 500 }
    )
  }
}

