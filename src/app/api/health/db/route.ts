import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/health/db
// Lightweight DB reachability check without requiring login.
export async function GET() {
  const startedAt = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    const latencyMs = Date.now() - startedAt
    return NextResponse.json(
      {
        ok: true,
        db: 'up',
        latencyMs,
        at: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error: unknown) {
    const latencyMs = Date.now() - startedAt
    const message = error instanceof Error ? error.message : 'Database health check failed'
    return NextResponse.json(
      {
        ok: false,
        db: 'down',
        latencyMs,
        error: message,
        at: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}

