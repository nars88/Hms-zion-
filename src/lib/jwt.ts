import { SignJWT, jwtVerify } from 'jose'

// Edge-compatible JWT helpers. Used by:
//   - /api/auth/login          → mints a signed token on successful login
//   - /api/auth/verify-role    → validates a token & returns its role
//   - /api/auth/logout         → clears the cookie
//   - /lib/apiAuth.ts          → identifies the caller for API route auth
//   - middleware.ts (via fetch to verify-role)
//
// Prefer JWT_SECRET; accept NEXTAUTH_SECRET so Vercel projects that only set Auth.js-style
// env still mint/verify tokens consistently across Node route handlers and Edge middleware.
const RAW_SECRET =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'nars-hospital-dev-secret-change-in-production'
const SECRET = new TextEncoder().encode(RAW_SECRET)

export interface JWTPayload {
  userId: string
  role: string
  name: string
  /** Must match `User.authTokenVersion` or the session is treated as revoked. */
  tokenVersion: number
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({
    userId: payload.userId,
    role: payload.role,
    name: payload.name,
    tokenVersion: payload.tokenVersion,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    const p = payload as unknown as Partial<JWTPayload> & { tokenVersion?: number }
    if (!p.userId || !p.role || !p.name) return null
    const tokenVersion =
      typeof p.tokenVersion === 'number' && Number.isInteger(p.tokenVersion) ? p.tokenVersion : 0
    return {
      userId: p.userId,
      role: p.role,
      name: p.name,
      tokenVersion,
    }
  } catch {
    return null
  }
}
