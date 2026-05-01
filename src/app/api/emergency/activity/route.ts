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

    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string
        action: string
        details: string | null
        actorName: string | null
        createdAt: Date
      }>
    >(
      `SELECT
         id,
         action,
         details,
         actor_name AS "actorName",
         created_at AS "createdAt"
       FROM activity_history
       WHERE visit_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
      visitId
    ).catch(() => [])

    return NextResponse.json(rows)
  } catch (error) {
    console.error('Error fetching emergency activity:', error)
    return NextResponse.json({ error: 'Failed to fetch activity history' }, { status: 500 })
  }
}
