import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'

// Extracts & verifies the signed JWT from the zionmed_auth_token cookie.
// Returns the authenticated user (id / role / name) or null. API routes
// compose this with unauthorized()/forbidden() to enforce access control.
export async function getRequestUser(request: Request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const tokenMatch = cookieHeader.match(/zionmed_auth_token=([^;]+)/)
  const token = tokenMatch?.[1]
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  return {
    id: payload.userId,
    role: payload.role,
    name: payload.name,
  }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
