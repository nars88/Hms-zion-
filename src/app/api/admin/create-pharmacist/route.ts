import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

// POST /api/admin/create-pharmacist
// Creates the pharmacy user account
export async function POST(request: Request) {
  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: 'pharmacy@zion.com' },
    })

    if (existing) {
      // Update existing user
      const updated = await prisma.user.update({
        where: { email: 'pharmacy@zion.com' },
        data: {
          password: 'zion123', // Plain text for now (matching login API)
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
        password: 'zion123', // Plain text for now (matching login API)
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

