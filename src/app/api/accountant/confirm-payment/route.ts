import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import { getRequestUser, forbidden, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['ACCOUNTANT', 'ADMIN']

// POST /api/accountant/confirm-payment
// Marks bill as PAID. Only Accountant or Admin can trigger this.
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!ALLOWED_ROLES.includes(user.role)) return forbidden()

    const body = await request.json()
    const { visitId, paymentMethod, confirmedBy } = body

    const confirmedById = String(confirmedBy || user.id || '').trim()
    if (!visitId || !confirmedById) {
      return NextResponse.json(
        { error: 'Missing required fields: visitId, confirmedBy' },
        { status: 400 }
      )
    }

    // Find the bill
    const bill = await prisma.bill.findUnique({
      where: { visitId },
    })

    if (!bill) {
      return NextResponse.json(
        { error: 'Bill not found for this visit' },
        { status: 404 }
      )
    }

    if (bill.paymentStatus === 'Paid') {
      return NextResponse.json(
        { error: 'Bill is already paid' },
        { status: 400 }
      )
    }

    // Update bill to PAID
    const updatedBill = await prisma.bill.update({
      where: { id: bill.id },
      data: {
        paymentStatus: 'Paid',
        paymentMethod: paymentMethod || 'Cash',
        paidAt: new Date(),
        qrStatus: 'CLEARED', // Clear QR code for exit
        generatedBy: confirmedById,
        updatedAt: new Date(),
      },
    })

    // Set visit to COMPLETED (or Discharged for ER) so it leaves the queue and appears in Archive
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, chiefComplaint: true },
    })
    if (visit) {
      const isER =
        visit.chiefComplaint?.toLowerCase().includes('emergency') ||
        visit.chiefComplaint?.toLowerCase().includes('er')
      await prisma.visit.update({
        where: { id: visitId },
        data: {
          status: isER ? VisitStatus.Discharged : VisitStatus.COMPLETED,
          ...(isER && { dischargeDate: new Date() }),
          updatedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      bill: updatedBill,
      message: 'Payment confirmed successfully',
    })
  } catch (error: any) {
    console.error('❌ Error confirming payment:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}

