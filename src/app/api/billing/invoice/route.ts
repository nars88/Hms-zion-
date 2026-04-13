import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/billing/invoice?visitId=XXX
// Get invoice by Visit ID
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const visitId = searchParams.get('visitId')

    if (!visitId) {
      return NextResponse.json(
        { error: 'Visit ID is required' },
        { status: 400 }
      )
    }

    // Find bill by visitId
    const bill = await prisma.bill.findUnique({
      where: { visitId },
      include: {
        patient: true,
      },
    })

    if (!bill) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      bill,
    })
  } catch (error: any) {
    console.error('❌ Error fetching invoice:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}

