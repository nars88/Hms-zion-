import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_SYSTEM_NAME, SYSTEM_SETTINGS_ID } from '@/lib/brandingConstants'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/system/branding — public read for login, landing, sidebars
export async function GET() {
  try {
    const delegate = prisma.systemSettings
    if (!delegate?.findUnique) {
      return NextResponse.json({
        systemName: DEFAULT_SYSTEM_NAME,
        logoUrl: null,
      })
    }

    const row = await delegate.findUnique({
      where: { id: SYSTEM_SETTINGS_ID },
      select: { systemName: true, logoUrl: true },
    })
    return NextResponse.json({
      systemName: row?.systemName?.trim() || DEFAULT_SYSTEM_NAME,
      logoUrl: row?.logoUrl?.trim() || null,
    })
  } catch {
    return NextResponse.json({
      systemName: DEFAULT_SYSTEM_NAME,
      logoUrl: null,
    })
  }
}
