import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/billing/invoice/remove-item
// Removes an item from invoice (for pending orders only)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { visitId, description } = body

    if (!visitId || !description) {
      return NextResponse.json(
        { error: 'Missing required fields: visitId, description' },
        { status: 400 }
      )
    }

    // Find bill
    const bill = await prisma.bill.findUnique({
      where: { visitId },
    })

    if (!bill) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Parse existing items
    const existingItems = Array.isArray(bill.items) ? bill.items : []
    
    // Remove item matching description
    const updatedItems = existingItems.filter((item: any) => {
      return item.description !== description
    })

    // Recalculate totals
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
      message: 'Item removed from invoice',
      bill: updatedBill,
    })
  } catch (error: any) {
    console.error('❌ Error removing item from invoice:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to remove item from invoice' },
      { status: 500 }
    )
  }
}

