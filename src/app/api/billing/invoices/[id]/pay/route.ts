import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'
import { VisitStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// POST /api/billing/invoices/[id]/pay
// Marks invoice as paid and automatically updates QR status to CLEARED
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['ACCOUNTANT', 'ADMIN'].includes(user.role)) return forbidden()

    const { id } = await params
    const body = await request.json()
    const { paymentMethod } = body

    // Find bill
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        visit: true,
      },
    })

    if (!bill) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Update bill: mark as paid and clear QR status
    const updatedBill = await prisma.bill.update({
      where: { id },
      data: {
        paymentStatus: 'Paid',
        paymentMethod: paymentMethod || 'Cash',
        qrStatus: 'CLEARED', // Automatically unlock exit gate
        paidAt: new Date(),
        updatedAt: new Date(),
      },
    })

    const visitId = bill.visit?.id
    if (visitId) {
      let parsedNotes: Record<string, unknown> = {}
      try {
        if (bill.visit.notes) parsedNotes = JSON.parse(bill.visit.notes) as Record<string, unknown>
      } catch {
        parsedNotes = {}
      }
      const isER =
        bill.visit.chiefComplaint?.toLowerCase().includes('emergency') ||
        bill.visit.chiefComplaint?.toLowerCase().includes('er')
      await prisma.visit.update({
        where: { id: visitId },
        data: {
          status: isER ? VisitStatus.Discharged : VisitStatus.COMPLETED,
          bedNumber: null,
          notes: JSON.stringify({
            ...parsedNotes,
            bedExitState: 'AVAILABLE',
            bedReleasedAt: new Date().toISOString(),
          }),
          updatedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Invoice marked as paid. QR Status updated to CLEARED.',
      bill: updatedBill,
    })
  } catch (error) {
    console.error('❌ Error marking invoice as paid:', error)
    return NextResponse.json(
      { error: 'Failed to mark invoice as paid' },
      { status: 500 }
    )
  }
}

