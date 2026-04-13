import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type DeptRow = {
  id: string
  name: string
  description: string | null
  color: string | null
  head_employee_id: string | null
  hod_name: string | null
  hod_tag: string | null
  employee_ids: unknown
  created_at: string
}

function parseEmployeeIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === 'string')
  if (typeof value === 'string' && value) {
    try {
      const p = JSON.parse(value)
      if (Array.isArray(p)) return p.filter((x): x is string => typeof x === 'string')
    } catch {
      return []
    }
  }
  return []
}

export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe<DeptRow[]>(
      `SELECT id, name, description, color, head_employee_id, hod_name, hod_tag, employee_ids, created_at
       FROM departments
       ORDER BY created_at DESC`
    )

    const fromDb = rows.map((d) => {
      const savedEmployeeIds = parseEmployeeIds(d.employee_ids)

      return {
        id: d.id,
        name: d.name,
        headEmployeeId: d.head_employee_id || '',
        description: d.description || 'No description yet.',
        color: d.color || '#4f46e5',
        headOfDepartmentName: d.hod_name || 'Not assigned',
        hodTag: d.hod_tag || 'Department Lead',
        assignedEmployeeIds: savedEmployeeIds,
        employeeCount: savedEmployeeIds.length,
        createdAt: d.created_at,
      }
    })
    return NextResponse.json({ success: true, departments: fromDb })
  } catch (error: any) {
    console.error('❌ Error fetching departments:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch departments' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const description = typeof body?.description === 'string' ? body.description.trim() : ''
    const color = typeof body?.color === 'string' ? body.color.trim() : ''
    const headEmployeeId = typeof body?.headEmployeeId === 'string' ? body.headEmployeeId.trim() : ''
    const hodName = typeof body?.headOfDepartmentName === 'string' ? body.headOfDepartmentName.trim() : ''
    const hodTag = typeof body?.hodTag === 'string' ? body.hodTag.trim() : ''
    const assignedEmployeeIds = Array.isArray(body?.assignedEmployeeIds)
      ? body.assignedEmployeeIds.filter((x: unknown) => typeof x === 'string')
      : []
    if (!name) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 })
    }

    const id = crypto.randomUUID()
    const [rows] = await prisma.$transaction(async (tx) => {
      const result = await tx.$queryRawUnsafe<DeptRow[]>(
        `INSERT INTO departments (id, name, description, color, head_employee_id, hod_name, hod_tag, employee_ids)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
         RETURNING id, name, description, color, head_employee_id, hod_name, hod_tag, employee_ids, created_at`,
        id,
        name,
        description || null,
        color || '#4f46e5',
        headEmployeeId || null,
        hodName || null,
        hodTag || null,
        JSON.stringify(assignedEmployeeIds)
      )
      if (assignedEmployeeIds.length > 0) {
        await tx.$executeRawUnsafe(
          `UPDATE users SET department_id = $1 WHERE id = ANY($2::text[])`,
          id,
          assignedEmployeeIds
        )
      }
      return [result]
    })

    return NextResponse.json({ success: true, department: rows[0] }, { status: 201 })
  } catch (error: any) {
    const msg = String(error?.message || '')
    if (msg.includes('duplicate key') || msg.includes('unique')) {
      return NextResponse.json({ error: 'Department already exists' }, { status: 409 })
    }
    console.error('❌ Error creating department:', error)
    return NextResponse.json({ error: error?.message || 'Failed to create department' }, { status: 500 })
  }
}

