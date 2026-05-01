import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'
/** Prisma requires Node (native engine); avoid Edge where `prisma` delegates can be missing. */
export const runtime = 'nodejs'

const MAX_ROWS = 500

// GET /api/admin/audit-logs — ADMIN only; optional filters: user, date (YYYY-MM-DD)
// IMMUTABLE: Deletion or modification of Audit Logs is strictly prohibited by system architecture.
// There are no PATCH, PUT, or DELETE handlers for AuditLog — append-only via writeAuditLog only.
export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const { searchParams } = new URL(request.url)
    const userQ = searchParams.get('user')?.trim() || ''
    const dateQ = searchParams.get('date')?.trim() || ''

    const where: {
      userName?: { contains: string; mode: 'insensitive' }
      createdAt?: { gte: Date; lt: Date }
    } = {}

    if (userQ) {
      where.userName = { contains: userQ, mode: 'insensitive' }
    }

    if (dateQ && /^\d{4}-\d{2}-\d{2}$/.test(dateQ)) {
      const start = new Date(`${dateQ}T00:00:00.000Z`)
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
      if (Number.isFinite(start.getTime())) {
        where.createdAt = { gte: start, lt: end }
      }
    }

    const audit = prisma.auditLog
    if (!audit || typeof audit.findMany !== 'function') {
      return NextResponse.json(
        {
          error:
            'AuditLog is not available on this server client. Run `npx prisma generate`, restart the app, and apply migrations (`npx prisma migrate deploy` or `npx prisma db push`).',
        },
        { status: 503 }
      )
    }

    const logs = await audit.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { createdAt: 'desc' },
      take: MAX_ROWS,
      select: {
        id: true,
        userId: true,
        userName: true,
        userRole: true,
        action: true,
        metadata: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ success: true, logs })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load audit logs.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
