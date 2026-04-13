import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['ACCOUNTANT', 'ADMIN']

// POST /api/accountant/confirm-payment
// Marks bill as PAID. Only Accountant or Admin can trigger this.
export async function POST(request: NextRequest) {
  try {
    const roleCookie = request.cookies.get('zionmed_user_role')
    const userIdCookie = request.cookies.get('zionmed_auth_token')

    if (!userIdCookie?.value || !roleCookie?.value || !ALLOWED_ROLES.includes(roleCookie.value)) {
      return NextResponse.json(
        { error: 'Unauthorized: Only Accountant or Admin can confirm payments.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { visitId, paymentMethod, confirmedBy } = body

    if (!visitId || !confirmedBy) {
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

