import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// POST /api/admin/security/override
// Manual override for Admin to clear a patient's QR status (emergency/system outage)
// Creates an audit log entry
export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const body = await request.json()
    const { patientId, visitId, reason } = body

    if (!patientId || !visitId || !reason) {
      return NextResponse.json(
        { error: 'patientId, visitId, and reason are required' },
        { status: 400 }
      )
    }

    // Find bill
    const bill = await prisma.bill.findFirst({
      where: {
        visitId,
        patientId,
      },
    })

    if (!bill) {
      return NextResponse.json(
        { error: 'Invoice not found for this visit' },
        { status: 404 }
      )
    }

    // Update QR status to CLEARED
    await prisma.bill.update({
      where: { id: bill.id },
      data: {
        qrStatus: 'CLEARED',
        updatedAt: new Date(),
      },
    })

    // Create audit log entry (stored in visit notes for now - can be enhanced with a dedicated AuditLog table)
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
    })

    if (visit) {
      const auditEntry = `[MANUAL OVERRIDE] QR Status cleared by Admin (${user.id}) at ${new Date().toISOString()}. Reason: ${reason}`
      await prisma.visit.update({
        where: { id: visitId },
        data: {
          notes: visit.notes
            ? `${visit.notes}\n${auditEntry}`
            : auditEntry,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'QR Status manually cleared. Audit log created.',
      billId: bill.id,
    })
  } catch (error) {
    console.error('❌ Error in manual override:', error)
    return NextResponse.json(
      { error: 'Failed to perform manual override' },
      { status: 500 }
    )
  }
}

