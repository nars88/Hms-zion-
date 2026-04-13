import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

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
    return NextResponse.json({ success: true, user: safeUser })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Login failed' }, { status: 500 })
  }
}

