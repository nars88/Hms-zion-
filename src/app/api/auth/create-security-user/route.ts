import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// POST /api/auth/create-security-user
// Creates the Security/Gatekeeper user account
// This is a one-time setup endpoint
export async function POST(request: Request) {
  try {
    // Check if security user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: 'security@zion.com',
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { 
          message: 'Security user already exists',
          user: {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
            role: existingUser.role,
          }
        },
        { status: 200 }
      )
    }

    // Create security user
    const securityUser = await prisma.user.create({
      data: {
        email: 'security@zion.com',
        password: 'Zion2026', // Plain text for now - TODO: hash with bcrypt in production
        name: 'Security Officer',
        role: UserRole.SECURITY,
        phone: '+964', // Default phone
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Security user created successfully',
      user: securityUser,
      credentials: {
        email: 'security@zion.com',
        password: 'Zion2026',
      },
    })
  } catch (error: any) {
    console.error('❌ Error creating security user:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create security user' },
      { status: 500 }
    )
  }
}

