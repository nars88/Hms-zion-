import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole, VisitStatus } from '@prisma/client'
import { getRequestUser, forbidden, unauthorized } from '@/lib/apiAuth'
import { forbiddenPaymentFinalize, toAuditActor } from '@/lib/rbacClinical'
import { writeAuditLogTx } from '@/lib/auditLog'

export const dynamic = 'force-dynamic'

// POST /api/accountant/confirm-payment
// Marks bill as PAID. Only ACCOUNTANT may finalize payment (ADMIN is explicitly blocked).
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (user.role !== UserRole.ACCOUNTANT) {
      if (user.role === UserRole.ADMIN) return forbiddenPaymentFinalize(user, request)
      return forbidden()
    }

    const body = await request.json()
    const { visitId, paymentMethod, confirmedBy } = body

    const confirmedById = String(confirmedBy || user.id || '').trim()
    if (!visitId || !confirmedById) {
      return NextResponse.json(
        { error: 'Missing required fields: visitId, confirmedBy' },
        { status: 400 }
      )
    }

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

    const updatedBill = await prisma.$transaction(async (tx) => {
      const paid = await tx.bill.update({
        where: { id: bill.id },
        data: {
          paymentStatus: 'Paid',
          paymentMethod: paymentMethod || 'Cash',
          paidAt: new Date(),
          qrStatus: 'CLEARED',
          generatedBy: confirmedById,
          updatedAt: new Date(),
        },
      })

      const visit = await tx.visit.findUnique({
        where: { id: visitId },
        select: { id: true, chiefComplaint: true, notes: true },
      })

      if (visit) {
        const isER =
          visit.chiefComplaint?.toLowerCase().includes('emergency') ||
          visit.chiefComplaint?.toLowerCase().includes('er')
        let parsedNotes: Record<string, unknown> = {}
        try {
          if (visit.notes) parsedNotes = JSON.parse(visit.notes) as Record<string, unknown>
        } catch {
          parsedNotes = {}
        }
        await tx.visit.update({
          where: { id: visitId },
          data: {
            status: isER ? VisitStatus.Discharged : VisitStatus.COMPLETED,
            bedNumber: null,
            notes: JSON.stringify({
              ...parsedNotes,
              bedExitState: 'AVAILABLE',
              bedReleasedAt: new Date().toISOString(),
            }),
            ...(isER && { dischargeDate: new Date() }),
            updatedAt: new Date(),
          },
        })
      }

      await writeAuditLogTx(tx, {
        actor: toAuditActor(user),
        request,
        action: 'PAYMENT_FINALIZED',
        metadata: {
          billId: bill.id,
          visitId,
          paymentStatus: 'Paid',
        },
      })

      return paid
    })

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
