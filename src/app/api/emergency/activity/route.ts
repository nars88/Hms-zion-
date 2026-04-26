import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestUser, forbidden, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// GET /api/emergency/activity?visitId=...
export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['DOCTOR', 'ER_NURSE', 'ADMIN', 'ER_INTAKE_NURSE'].includes(user.role)) return forbidden()

    const url = new URL(request.url)
    const visitId = url.searchParams.get('visitId')?.trim()
    if (!visitId) return NextResponse.json({ error: 'visitId is required' }, { status: 400 })

    const rows = await prisma.activityHistory.findMany({
      where: { visitId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        action: true,
        details: true,
        actorName: true,
        createdAt: true,
      },
    })

    return NextResponse.json(rows)
  } catch (error) {
    console.error('Error fetching emergency activity:', error)
    return NextResponse.json({ error: 'Failed to fetch activity history' }, { status: 500 })
  }
}
