import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// POST /api/radiology/add-procedure
// Adds radiology/sonar procedure fee to the bill
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['RADIOLOGY_TECH', 'ADMIN'].includes(user.role)) return forbidden()

    const body = await request.json()
    const { visitId, patientId, procedureName, procedureType, price, addedBy } = body

    if (!visitId || !patientId || !procedureName || !price) {
      return NextResponse.json(
        { error: 'Missing required fields: visitId, patientId, procedureName, price' },
        { status: 400 }
      )
    }

    // Find or create bill
    let bill = await prisma.bill.findUnique({
      where: { visitId },
    })

    const items = bill ? (bill.items as any[]) : []
    
    // Add procedure item
    const procedureItem = {
      department: 'Radiology',
      description: `${procedureType || 'Procedure'}: ${procedureName}`,
      quantity: 1,
      unitPrice: price,
      total: price,
      addedAt: new Date().toISOString(),
      addedBy: addedBy || 'radiology',
    }

    const updatedItems = [...items, procedureItem]
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
          generatedBy: addedBy || 'radiology',
          items: [procedureItem],
          subtotal: price,
          tax: 0,
          discount: 0,
          total: price,
          paymentStatus: 'Pending',
        },
      })
    }

    return NextResponse.json({
      success: true,
      bill,
      message: 'Procedure fee added to invoice successfully',
    })
  } catch (error: any) {
    console.error('❌ Error adding procedure to invoice:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to add procedure to invoice' },
      { status: 500 }
    )
  }
}

