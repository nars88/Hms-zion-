import { SignJWT, jwtVerify } from 'jose'

// Edge-compatible JWT helpers. Used by:
//   - /api/auth/login          → mints a signed token on successful login
//   - /api/auth/verify-role    → validates a token & returns its role
//   - /api/auth/logout         → clears the cookie
//   - /lib/apiAuth.ts          → identifies the caller for API route auth
//   - middleware.ts (via fetch to verify-role)
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'zion-med-secret-change-in-production-2025'
)

export interface JWTPayload {
  userId: string
  role: string
  name: string
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    const p = payload as unknown as Partial<JWTPayload>
    if (!p.userId || !p.role || !p.name) return null
    return {
      userId: p.userId,
      role: p.role,
      name: p.name,
    }
  } catch {
    return null
  }
}
