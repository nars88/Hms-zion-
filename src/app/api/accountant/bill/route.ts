import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/accountant/bill?visitId=xxx
// Returns a single bill (for viewing invoice from archive or deep link)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const visitId = searchParams.get('visitId')
    if (!visitId) {
      return NextResponse.json(
        { error: 'Missing visitId' },
        { status: 400 }
      )
    }

    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        bill: true,
      },
    })

    if (!visit?.bill) {
      return NextResponse.json(
        { error: 'Bill not found for this visit' },
        { status: 404 }
      )
    }

    const bill = visit.bill
    const nameParts = visit.patient
      ? [visit.patient.firstName, visit.patient.lastName].filter(Boolean)
      : ['Unknown', 'Patient']

    return NextResponse.json({
      success: true,
      bill: {
        id: bill.id,
        visitId: visit.id,
        patient: visit.patient
          ? {
              id: visit.patient.id,
              firstName: visit.patient.firstName,
              lastName: visit.patient.lastName,
              phone: visit.patient.phone ?? '',
            }
          : { id: '', firstName: nameParts[0], lastName: nameParts[1] || '', phone: '' },
        items: bill.items,
        subtotal: Number(bill.subtotal),
        tax: Number(bill.tax),
        discount: Number(bill.discount),
        total: Number(bill.total),
        paymentStatus: bill.paymentStatus,
        paymentMethod: bill.paymentMethod,
        qrCode: bill.qrCode,
        qrStatus: bill.qrStatus,
        paidAt: bill.paidAt,
        createdAt: bill.createdAt,
        updatedAt: bill.updatedAt,
      },
    })
  } catch (error: any) {
    console.error('❌ Error fetching bill:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to load bill' },
      { status: 500 }
    )
  }
}
