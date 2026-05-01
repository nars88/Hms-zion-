import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'
import { UserRole, VisitStatus } from '@prisma/client'
import { forbiddenPaymentFinalize, toAuditActor } from '@/lib/rbacClinical'
import { writeAuditLogTx } from '@/lib/auditLog'

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
    if (user.role !== UserRole.ACCOUNTANT) {
      if (user.role === UserRole.ADMIN) return forbiddenPaymentFinalize(user, request)
      return forbidden()
    }

    const { id } = await params
    const body = await request.json()
    const { paymentMethod } = body

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

    const updatedBill = await prisma.$transaction(async (tx) => {
      const paid = await tx.bill.update({
        where: { id },
        data: {
          paymentStatus: 'Paid',
          paymentMethod: paymentMethod || 'Cash',
          qrStatus: 'CLEARED',
          paidAt: new Date(),
          updatedAt: new Date(),
        },
      })

      const visitId = bill.visit?.id
      if (visitId && bill.visit) {
        let parsedNotes: Record<string, unknown> = {}
        try {
          if (bill.visit.notes) parsedNotes = JSON.parse(bill.visit.notes) as Record<string, unknown>
        } catch {
          parsedNotes = {}
        }
        const isER =
          bill.visit.chiefComplaint?.toLowerCase().includes('emergency') ||
          bill.visit.chiefComplaint?.toLowerCase().includes('er')
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
            updatedAt: new Date(),
          },
        })
      }

      await writeAuditLogTx(tx, {
        actor: toAuditActor(user),
        request,
        action: 'PAYMENT_FINALIZED',
        metadata: {
          billId: id,
          visitId: bill.visitId,
          paymentStatus: 'Paid',
        },
      })

      return paid
    })

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
