import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'
import { Prisma } from '@prisma/client'
import { countErAdmissionBillItems } from '@/lib/billing/erAdmission'

export const dynamic = 'force-dynamic'
const ER_ADMISSION_MARKER = 'ER Admission Fee'

// POST /api/billing/invoice/sync
// Syncs invoice items to database Bill model
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['ACCOUNTANT', 'ADMIN'].includes(user.role)) return forbidden()

    const body = await request.json()
    const { visitId, patientId, items, subtotal, tax, discount, total, generatedBy } = body
    const incomingItems = Array.isArray(items) ? items : null

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

    if (bill && incomingItems && user.role !== 'ADMIN') {
      const existingItems = Array.isArray(bill.items) ? bill.items : []
      const existingAdmission = existingItems.find((item: any) =>
        String(item?.description || '').toLowerCase().includes(ER_ADMISSION_MARKER.toLowerCase())
      ) as { total?: number; description?: string } | undefined
      const incomingAdmission = incomingItems.find((item: any) =>
        String(item?.description || '').toLowerCase().includes(ER_ADMISSION_MARKER.toLowerCase())
      ) as { total?: number; description?: string } | undefined
      if (
        existingAdmission &&
        (!incomingAdmission || Number(incomingAdmission.total || 0) !== Number(existingAdmission.total || 0))
      ) {
        return NextResponse.json(
          { error: 'ER Admission Fee is locked for non-admin invoice sync operations.' },
          { status: 403 }
        )
      }
    }

    if (!bill) {
      const createItems = Array.isArray(items) ? items : []
      if (countErAdmissionBillItems(createItems) > 1) {
        return NextResponse.json(
          {
            error:
              'Invoice cannot contain more than one ER Admission Fee line. Remove duplicates and sync again.',
          },
          { status: 400 }
        )
      }
      bill = await prisma.bill.create({
        data: {
          visitId,
          patientId,
          generatedBy: generatedBy || 'system',
          items: createItems,
          subtotal: subtotal || 0,
          tax: tax || 0,
          discount: discount || 0,
          total: total || 0,
          paymentStatus: 'Pending',
        },
      })
    } else {
      const mergedForCheck = incomingItems ?? (Array.isArray(bill.items) ? bill.items : [])
      if (countErAdmissionBillItems(mergedForCheck) > 1) {
        return NextResponse.json(
          {
            error:
              'Invoice cannot contain more than one ER Admission Fee line. Remove duplicates and sync again.',
          },
          { status: 400 }
        )
      }
      bill = await prisma.bill.update({
        where: { id: bill.id },
        data: {
          items: (incomingItems || bill.items) as Prisma.InputJsonValue,
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

