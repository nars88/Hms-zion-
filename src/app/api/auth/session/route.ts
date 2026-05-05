import { NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// GET /api/auth/session
// Returns current authenticated user from JWT cookie (httpOnly).
export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return NextResponse.json({ authenticated: false }, { status: 401 })
    return NextResponse.json({ authenticated: true, user })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}
