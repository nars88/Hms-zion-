import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET /api/notifications/counts
// Used by sidebar for live sync badge (polling)
export async function GET() {
  try {
    const pendingBillsCount = await prisma.bill.count({
      where: {
        paymentStatus: 'Pending',
        visit: {
          status: { not: VisitStatus.Discharged },
        },
      },
    })

    return NextResponse.json({
      pendingInvoices: pendingBillsCount,
      labRequests: 0,
    })
  } catch (e) {
    console.error('Error fetching notification counts:', e)
    return NextResponse.json({ pendingInvoices: 0, labRequests: 0 })
  }
}
