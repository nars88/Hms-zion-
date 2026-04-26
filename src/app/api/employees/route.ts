import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { syncUserDepartmentLink, verifyDepartmentExists } from '@/lib/departmentEmployeeSync'

export const dynamic = 'force-dynamic'

const DEPT_ROLE_MAP: Record<string, string[]> = {
  laboratory: ['LAB_TECH'],
  radiology: ['RADIOLOGY_TECH'],
  sonar: ['RADIOLOGY_TECH'],
  pharmacy: ['PHARMACIST'],
  reception: ['RECEPTIONIST', 'RECEPTION', 'SECRETARY'],
  security: ['SECURITY'],
  accounting: ['ACCOUNTANT'],
  intake: ['INTAKE_NURSE', 'ER_NURSE'],
  emergency: ['ER_NURSE', 'ER_INTAKE_NURSE', 'DOCTOR'],
}

// GET /api/employees - Fetch all employees (with department name when linked)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const departmentType = searchParams.get('departmentType')?.toLowerCase() ?? ''
    const roles = DEPT_ROLE_MAP[departmentType]

    // Do NOT select departmentId via Prisma here: if `department_id` was never migrated on the DB,
    // Prisma would throw and the whole list would 500. Load core columns only, then enrich below.
    const users = await prisma.user.findMany({
      where: roles ? { role: { in: roles as UserRole[] } } : { role: { not: UserRole.ADMIN } },
      select: {
        id: true,
        name: true,
        role: true,
        email: true,
        phone: true,
        education: true,
      },
      orderBy: { name: 'asc' },
    })

    const userIds = users.map((u) => u.id)
    const deptIdByUserId = new Map<string, string>()
    if (userIds.length > 0) {
      try {
        const linkRows = await prisma.$queryRawUnsafe<Array<{ id: string; department_id: string | null }>>(
          `SELECT id, department_id FROM users WHERE id = ANY($1::text[])`,
          userIds
        )
        for (const row of linkRows) {
          if (row.department_id) deptIdByUserId.set(row.id, row.department_id)
        }
      } catch {
        // Column or table mismatch — employees still load without department link
      }
    }

    const deptIds = Array.from(new Set(Array.from(deptIdByUserId.values())))
    let nameByDeptId = new Map<string, string>()
    if (deptIds.length > 0) {
      try {
        const ph = deptIds.map((_, i) => `$${i + 1}`).join(', ')
        const deptRows = await prisma.$queryRawUnsafe<Array<{ id: string; name: string }>>(
          `SELECT id, name FROM departments WHERE id IN (${ph})`,
          ...deptIds
        )
        nameByDeptId = new Map(deptRows.map((r) => [r.id, r.name]))
      } catch {
        // `departments` table or query issue — still return employees without names
      }
    }

    const employees = users.map((u) => {
      const did = deptIdByUserId.get(u.id) ?? null
      return {
      id: u.id,
      name: u.name,
      role: u.role,
      email: u.email,
      phone: u.phone,
      education: u.education,
      departmentId: did,
      departmentName: did ? nameByDeptId.get(did) ?? null : null,
      employeeTag: u.role
        .split('_')
        .map((w: string) => w[0] + w.slice(1).toLowerCase())
        .join(' '),
    }
    })

    return NextResponse.json({ employees })
  } catch (error: any) {
    console.error('❌ Error fetching employees:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

// POST /api/employees - Create new employee (department required)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      password,
      role,
      phone,
      address,
      experience,
      departmentId,
    } = body

    const deptId = typeof departmentId === 'string' ? departmentId.trim() : ''
    if (!name?.trim() || !email?.trim() || !password || !role || !deptId) {
      return NextResponse.json(
        { error: 'Name, email, password, role, and department are required' },
        { status: 400 }
      )
    }

    const okDept = await verifyDepartmentExists(deptId)
    if (!okDept) {
      return NextResponse.json({ error: 'Invalid department' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }

    const assignableRoles = Object.values(UserRole).filter((r) => String(r) !== 'CASHIER')
    if (!assignableRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: await bcrypt.hash(password, 12),
        role: role as UserRole,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        education: null,
        experience: experience ? parseInt(experience.toString()) : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        education: true,
        experience: true,
      },
    })

    await syncUserDepartmentLink(user.id, deptId)

    return NextResponse.json({
      success: true,
      employee: { ...user, departmentId: deptId },
    })
  } catch (error: any) {
    console.error('❌ Error creating employee:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create employee' },
      { status: 500 }
    )
  }
}
