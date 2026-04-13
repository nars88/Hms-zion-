import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/billing/invoice/add-item
// Adds an item to a patient's invoice
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { visitId, patientId, department, description, quantity, unitPrice, total, addedBy } = body

    if (!visitId || !patientId || !department || !description || quantity === undefined || unitPrice === undefined || total === undefined || !addedBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Find or create bill for this visit
    let bill = await prisma.bill.findUnique({
      where: { visitId },
    })

    if (!bill) {
      // Create new bill
      bill = await prisma.bill.create({
        data: {
          visitId,
          patientId,
          generatedBy: addedBy,
          items: [],
          subtotal: 0,
          tax: 0,
          discount: 0,
          total: 0,
          paymentStatus: 'Pending',
        },
      })
    }

    // Parse existing items
    const existingItems = Array.isArray(bill.items) ? bill.items : []
    
    // Add new item
    const newItem = {
      id: `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      department,
      description,
      quantity,
      unitPrice,
      total,
      addedAt: new Date().toISOString(),
      addedBy,
    }

    const updatedItems = [...existingItems, newItem]
    const newSubtotal = updatedItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0)
    const newTotal = newSubtotal + Number(bill.tax) - Number(bill.discount)

    // Update bill
    const updatedBill = await prisma.bill.update({
      where: { id: bill.id },
      data: {
        items: updatedItems,
        subtotal: newSubtotal,
        total: newTotal,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Item added to invoice',
      bill: updatedBill,
    })
  } catch (error: any) {
    console.error('❌ Error adding item to invoice:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to add item to invoice' },
      { status: 500 }
    )
  }
}
