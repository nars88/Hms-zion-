import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'

function readAuthCookieFromHeader(cookieHeader: string): string | null {
  if (!cookieHeader) return null
  for (const segment of cookieHeader.split(';')) {
    const trimmed = segment.trim()
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const name = trimmed.slice(0, eq).trim()
    if (name !== 'zionmed_auth_token') continue
    let value = trimmed.slice(eq + 1).trim()
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    }
    try {
      value = decodeURIComponent(value)
    } catch {
      // keep raw (valid JWT charset is cookie-safe)
    }
    return value || null
  }
  return null
}

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
  const token = readAuthCookieFromHeader(cookieHeader)
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
