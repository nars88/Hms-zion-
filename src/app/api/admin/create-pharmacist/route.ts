import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// POST /api/admin/create-pharmacist
// Creates the pharmacy user account
export async function POST(request: Request) {
  try {
    const requester = await getRequestUser(request)
    if (!requester) return unauthorized()
    if (requester.role !== 'ADMIN') return forbidden()

    const defaultPassword = process.env.DEFAULT_PHARMACIST_PASSWORD?.trim()
    if (!defaultPassword) {
      return NextResponse.json({ error: 'DEFAULT_PHARMACIST_PASSWORD is not configured' }, { status: 500 })
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: 'pharmacy@zion.com' },
    })

    if (existing) {
      // Update existing user
      const updated = await prisma.user.update({
        where: { email: 'pharmacy@zion.com' },
        data: {
          password: defaultPassword,
          name: 'Senior Pharmacist',
          role: UserRole.PHARMACIST,
          phone: '+964 750 000 0005',
        },
      })

      return NextResponse.json({
        success: true,
        message: 'Pharmacist user updated successfully',
        user: {
          id: updated.id,
          email: updated.email,
          name: updated.name,
          role: updated.role,
        },
      })
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        email: 'pharmacy@zion.com',
        password: defaultPassword,
        name: 'Senior Pharmacist',
        role: UserRole.PHARMACIST,
        phone: '+964 750 000 0005',
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Pharmacist user created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error: any) {
    console.error('❌ Error creating pharmacist user:', error)
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to create pharmacist user',
        details: error?.code === 'P2002' ? 'User with this email already exists' : error?.message
      },
      { status: 500 }
    )
  }
}

