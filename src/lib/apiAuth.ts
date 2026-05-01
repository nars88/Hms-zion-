import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'

// Extracts & verifies the signed JWT from the zionmed_auth_token cookie.
// Returns the authenticated user (id / role / name) or null. API routes
// compose this with unauthorized()/forbidden() to enforce access control.
// Validates JWT `tokenVersion` against `User.authTokenVersion` (logout / revocation).
//
// When this returns null (missing cookie, invalid JWT, or authTokenVersion mismatch),
// handlers MUST use unauthorized() → 401. Do not use forbidden() for null, so session
// revocation is not confused with RBAC denials (403).
export async function getRequestUser(request: Request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const tokenMatch = cookieHeader.match(/zionmed_auth_token=([^;]+)/)
  const token = tokenMatch?.[1]
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  const row = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { authTokenVersion: true },
  })
  if (!row || row.authTokenVersion !== payload.tokenVersion) return null

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
