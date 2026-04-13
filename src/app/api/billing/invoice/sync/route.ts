import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST /api/billing/invoice/sync
// Syncs invoice items to database Bill model
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { visitId, patientId, items, subtotal, tax, discount, total, generatedBy } = body

    if (!visitId || !patientId) {
      return NextResponse.json(
        { error: 'Missing required fields: visitId, patientId' },
        { status: 400 }
      )
    }

    // Find or create bill
    let bill = await prisma.bill.findUnique({
      where: { visitId },
    })

    if (!bill) {
      bill = await prisma.bill.create({
        data: {
          visitId,
          patientId,
          generatedBy: generatedBy || 'system',
          items: items || [],
          subtotal: subtotal || 0,
          tax: tax || 0,
          discount: discount || 0,
          total: total || 0,
          paymentStatus: 'Pending',
        },
      })
    } else {
      bill = await prisma.bill.update({
        where: { id: bill.id },
        data: {
          items: items || bill.items,
          subtotal: subtotal !== undefined ? subtotal : bill.subtotal,
          tax: tax !== undefined ? tax : bill.tax,
          discount: discount !== undefined ? discount : bill.discount,
          total: total !== undefined ? total : bill.total,
          updatedAt: new Date(),
        },
      })
    }

    const completeVisit = body.completeVisit === true
    if (completeVisit && visitId) {
      const { VisitStatus } = await import('@prisma/client')
      await prisma.visit.update({
        where: { id: visitId },
        data: { status: VisitStatus.COMPLETED, updatedAt: new Date() },
      })
    }

    return NextResponse.json({
      success: true,
      bill,
      message: 'Invoice synced successfully',
    })
  } catch (error: any) {
    console.error('❌ Error syncing invoice:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to sync invoice' },
      { status: 500 }
    )
  }
}

