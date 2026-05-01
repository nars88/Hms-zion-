import { NextResponse } from 'next/server'
import { getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// Clears both auth cookies. The auth token is httpOnly and therefore cannot
// be removed from the client directly — it has to be expired by the server
// via a Set-Cookie header.
export async function POST(request: Request) {
  const user = await getRequestUser(request)
  if (!user) return unauthorized()

  const response = NextResponse.json({ success: true })
  response.cookies.set('zionmed_auth_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  response.cookies.set('zionmed_user_role', '', {
    maxAge: 0,
    path: '/',
  })
  return response
}
