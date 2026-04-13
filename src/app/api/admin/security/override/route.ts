import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// POST /api/admin/security/override
// Manual override for Admin to clear a patient's QR status (emergency/system outage)
// Creates an audit log entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patientId, visitId, reason } = body

    if (!patientId || !visitId || !reason) {
      return NextResponse.json(
        { error: 'patientId, visitId, and reason are required' },
        { status: 400 }
      )
    }

    // Get current user (must be Admin)
    const userIdCookie = request.cookies.get('zionmed_auth_token')
    const roleCookie = request.cookies.get('zionmed_user_role')

    if (!userIdCookie?.value || roleCookie?.value !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
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
      const auditEntry = `[MANUAL OVERRIDE] QR Status cleared by Admin (${userIdCookie.value}) at ${new Date().toISOString()}. Reason: ${reason}`
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

