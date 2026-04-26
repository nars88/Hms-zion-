import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestUser, unauthorized, forbidden } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// GET /api/admin/prices
// Returns all price settings
export async function GET() {
  try {
    const prices = await prisma.priceSettings.findMany({
      orderBy: [
        { category: 'asc' },
        { serviceName: 'asc' },
      ],
    })

    return NextResponse.json({
      success: true,
      prices,
    })
  } catch (error: any) {
    console.error('❌ Error fetching prices:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch prices' },
      { status: 500 }
    )
  }
}

// POST /api/admin/prices
// Creates or updates a price setting
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const body = await request.json()
    const { serviceType, serviceName, category, price, updatedBy } = body

    if (!serviceType || !serviceName || !category || price === undefined || !updatedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: serviceType, serviceName, category, price, updatedBy' },
        { status: 400 }
      )
    }

    // Check if price setting exists
    const existing = await prisma.priceSettings.findUnique({
      where: { serviceType },
    })

    if (existing) {
      // Update existing price
      const updated = await prisma.priceSettings.update({
        where: { serviceType },
        data: {
          serviceName,
          category,
          price,
          updatedBy,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        price: updated,
        message: 'Price updated successfully',
      })
    } else {
      // Create new price setting
      const created = await prisma.priceSettings.create({
        data: {
          serviceType,
          serviceName,
          category,
          price,
          updatedBy,
        },
      })

      return NextResponse.json({
        success: true,
        price: created,
        message: 'Price created successfully',
      })
    }
  } catch (error: any) {
    console.error('❌ Error saving price:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to save price' },
      { status: 500 }
    )
  }
}

