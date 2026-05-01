import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// POST /api/pharmacy/cancel-dispensing
// Cancels dispensing - sets visit to COMPLETED without deducting inventory or charging for medications
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['PHARMACIST', 'ADMIN'].includes(user.role)) return forbidden()

    const body = await request.json()
    const { visitId, patientId } = body

    if (!visitId || !patientId) {
      return NextResponse.json(
        { error: 'Missing required fields: visitId, patientId' },
        { status: 400 }
      )
    }

    // Find the visit
    const visit = await prisma.visit.findFirst({
      where: {
        id: visitId,
        patientId: patientId,
        status: VisitStatus.READY_FOR_PHARMACY,
      },
      include: {
        bill: true,
      },
    })

    if (!visit) {
      return NextResponse.json(
        { error: 'Visit not found or already processed' },
        { status: 404 }
      )
    }

    // Update visit status to COMPLETED
    const updatedVisit = await prisma.visit.update({
      where: { id: visitId },
      data: {
        status: VisitStatus.COMPLETED,
        updatedAt: new Date(),
      },
    })

    // If there's a bill, ensure medication charges are 0 (keep only consultation fee)
    if (visit.bill) {
      // Bill items are stored as JSON array
      const items = (visit.bill.items as any[]) || []
      
      // Filter out medication-related items (keep only consultation fee)
      const filteredItems = items.filter((item: any) => {
        const description = (item.description || '').toLowerCase()
        return !description.includes('medication') && 
               !description.includes('pharmacy') && 
               !description.includes('prescription') &&
               !description.includes('medicine')
      })

      // Recalculate totals (only consultation fee remains)
      const subtotal = filteredItems.reduce((sum: number, item: any) => sum + (item.total || 0), 0)
      const total = subtotal + Number(visit.bill.tax ?? 0) - Number(visit.bill.discount ?? 0)

      // Update bill to remove medication charges
      await prisma.bill.update({
        where: { id: visit.bill.id },
        data: {
          items: filteredItems,
          subtotal: subtotal,
          total: total,
          updatedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      success: true,
      visit: updatedVisit,
      message: 'Dispensing cancelled. Visit completed without medication charges.',
    })
  } catch (error: any) {
    console.error('❌ Error cancelling dispensing:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to cancel dispensing' },
      { status: 500 }
    )
  }
}

