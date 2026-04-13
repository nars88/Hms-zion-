import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/prices/get
// Returns price for a specific service type (used by billing system)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const serviceType = searchParams.get('serviceType')

    if (!serviceType) {
      return NextResponse.json(
        { error: 'Missing serviceType parameter' },
        { status: 400 }
      )
    }

    const priceSetting = await prisma.priceSettings.findUnique({
      where: { serviceType },
    })

    if (!priceSetting || !priceSetting.isActive) {
      return NextResponse.json(
        { error: 'Price not found or inactive' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      price: Number(priceSetting.price),
      serviceName: priceSetting.serviceName,
    })
  } catch (error: any) {
    console.error('❌ Error fetching price:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch price' },
      { status: 500 }
    )
  }
}

