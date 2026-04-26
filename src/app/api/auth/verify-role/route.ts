import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'

export const dynamic = 'force-dynamic'

// Called by middleware.ts on protected pages to confirm the token is valid
// and retrieve the role for downstream page gating.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ role: null })

  const payload = await verifyToken(token)
  return NextResponse.json({ role: payload?.role ?? null })
}
