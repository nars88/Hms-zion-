import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/jwt'

export const dynamic = 'force-dynamic'
const DB_LOGIN_TIMEOUT_MS = 5000

async function findUserWithRetry(email: string, retries = 2) {
  let lastError: unknown = null
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const timeoutMarker = Symbol('db-timeout')
      const user = await Promise.race([
        prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            password: true,
            authTokenVersion: true,
          },
        }),
        new Promise<typeof timeoutMarker>((resolve) => setTimeout(() => resolve(timeoutMarker), DB_LOGIN_TIMEOUT_MS)),
      ])
      if (user === timeoutMarker) {
        throw new Error('Database login lookup timed out')
      }
      return user
    } catch (error: unknown) {
      lastError = error
      const msg = error instanceof Error ? error.message : String(error)
      if (!msg.includes('Timed out fetching a new connection') && !msg.includes('Database login lookup timed out')) {
        throw error
      }
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 120 * (attempt + 1)))
      }
    }
  }
  throw lastError
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    const user = await findUserWithRetry(email.toLowerCase().trim())
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    // Bcrypt hashes start with $2a$, $2b$, $2y$ — legacy seed data may still store plain text.
    const looksHashed = /^\$2[aby]\$/.test(user.password)
    let valid = await bcrypt.compare(password, user.password)
    if (!valid && !looksHashed && password === user.password) {
      valid = true
    }
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Legacy CASHIER users are migrated to ACCOUNTANT (role removed from app UI).
    let roleOut = user.role
    if (String(user.role) === 'CASHIER') {
      roleOut = 'ACCOUNTANT'
    }

    const { password: _, ...safeUser } = { ...user, role: roleOut }

    // Sign a JWT binding id + role + name. The token is the ONLY thing the
    // server trusts from now on — raw user IDs can no longer impersonate.
    const token = await signToken({
      userId: safeUser.id,
      role: safeUser.role,
      name: safeUser.name,
      tokenVersion: user.authTokenVersion ?? 0,
    })

    const response = NextResponse.json({ success: true, user: safeUser })
    // httpOnly: JS cannot read or forge it (XSS-safe).
    response.cookies.set('zionmed_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    })
    // Role cookie is intentionally JS-readable so the UI (sidebar labels,
    // role badges, etc.) can render without hitting the server — it's
    // non-authoritative (server always re-verifies via the JWT).
    response.cookies.set('zionmed_user_role', safeUser.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
      path: '/',
    })
    return response
  } catch (error: any) {
    const message = String(error?.message || '')
    if (message.includes('Timed out fetching a new connection') || message.includes('Database login lookup timed out')) {
      return NextResponse.json({ error: 'Database is busy, please try again in a moment.' }, { status: 503 })
    }
    return NextResponse.json({ error: message || 'Login failed' }, { status: 500 })
  }
}

