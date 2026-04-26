import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { signToken } from '@/lib/jwt'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, name: true, email: true, role: true, password: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    // Bcrypt hashes start with $2a$, $2b$, $2y$ — legacy seed data may still store plain text.
    const looksHashed = /^\$2[aby]\$/.test(user.password)
    let valid = await bcrypt.compare(password, user.password)
    if (!valid && !looksHashed && password === user.password) {
      valid = true
      await prisma.user.update({
        where: { id: user.id },
        data: { password: await bcrypt.hash(password, 12) },
      })
    }
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Legacy CASHIER users are migrated to ACCOUNTANT (role removed from app UI).
    let roleOut = user.role
    if (String(user.role) === 'CASHIER') {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: UserRole.ACCOUNTANT },
      })
      roleOut = UserRole.ACCOUNTANT
    }

    const { password: _, ...safeUser } = { ...user, role: roleOut }

    // Sign a JWT binding id + role + name. The token is the ONLY thing the
    // server trusts from now on — raw user IDs can no longer impersonate.
    const token = await signToken({
      userId: safeUser.id,
      role: safeUser.role,
      name: safeUser.name,
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
    return NextResponse.json({ error: error?.message || 'Login failed' }, { status: 500 })
  }
}

