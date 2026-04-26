import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { syncUserDepartmentLink, verifyDepartmentExists } from '@/lib/departmentEmployeeSync'
import { getRequestUser, unauthorized, forbidden } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

/** CASHIER is deprecated; use ACCOUNTANT — excluded from admin role dropdowns */
const VALID_ROLES = Object.values(UserRole).filter((r) => String(r) !== 'CASHIER')

const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  education: true,
} as const

async function readDepartmentIdFromDb(userId: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ department_id: string | null }>>(
      `SELECT department_id FROM users WHERE id = $1 LIMIT 1`,
      userId
    )
    return rows[0]?.department_id ?? null
  } catch {
    return null
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const body = await request.json()
    const { email, password, name, role, specialization, education, departmentId } = body
    const updateData: {
      name?: string
      role?: UserRole
      education?: string | null
      email?: string
      password?: string
    } = {}

    let departmentChanged = false

    if (departmentId !== undefined) {
      const raw = departmentId === null || departmentId === '' ? null : String(departmentId).trim()
      if (raw) {
        const ok = await verifyDepartmentExists(raw)
        if (!ok) {
          return NextResponse.json({ error: 'Invalid department' }, { status: 400 })
        }
        await syncUserDepartmentLink(params.id, raw)
      } else {
        await syncUserDepartmentLink(params.id, null)
      }
      departmentChanged = true
    }

    if (name !== undefined) {
      const trimmed = String(name).trim()
      if (!trimmed) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      updateData.name = trimmed
    }

    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      updateData.role = role as UserRole
    }

    if (specialization !== undefined || education !== undefined) {
      const raw = specialization !== undefined ? specialization : education
      updateData.education =
        raw === null || raw === undefined ? null : String(raw).trim() === '' ? null : String(raw).trim()
    }

    if (email?.trim()) {
      const existing = await prisma.user.findFirst({
        where: { email: email.toLowerCase().trim(), NOT: { id: params.id } },
      })
      if (existing) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
      }
      updateData.email = email.toLowerCase().trim()
    }
    if (password?.trim()) {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
      }
      updateData.password = await bcrypt.hash(password, 12)
    }

    let updated:
      | {
          id: string
          name: string
          email: string
          role: UserRole
          education: string | null
        }
      | null
    if (Object.keys(updateData).length > 0) {
      updated = await prisma.user.update({
        where: { id: params.id },
        data: updateData,
        select: userPublicSelect,
      })
    } else if (departmentChanged) {
      updated = await prisma.user.findUnique({
        where: { id: params.id },
        select: userPublicSelect,
      })
      if (!updated) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
      }
    } else {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const departmentIdOut = await readDepartmentIdFromDb(params.id)

    return NextResponse.json({
      success: true,
      employee: { ...updated, departmentId: departmentIdOut },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    await syncUserDepartmentLink(params.id, null)
    await prisma.user.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete' }, { status: 500 })
  }
}
