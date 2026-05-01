import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const { id } = await params
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

    const [updatedRows] = await prisma.$transaction(async (tx) => {
      const result = await tx.$queryRawUnsafe<Array<{ id: string }>>(
        `UPDATE departments
         SET name = $1,
             description = $2,
             color = $3,
             head_employee_id = $4,
             hod_name = $5,
             hod_tag = $6,
             employee_ids = $7::jsonb
         WHERE id = $8
         RETURNING id`,
        name,
        description || null,
        color || '#4f46e5',
        headEmployeeId || null,
        hodName || null,
        hodTag || null,
        JSON.stringify(assignedEmployeeIds),
        id
      )

      if (!result.length) return [null]

      await tx.$executeRawUnsafe(
        `UPDATE users
         SET department_id = NULL
         WHERE department_id = $1
           AND NOT (id = ANY($2::text[]))`,
        id,
        assignedEmployeeIds
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

    if (!updatedRows?.length) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, id: updatedRows[0].id })
  } catch (error: any) {
    const msg = String(error?.message || '')
    if (msg.includes('duplicate key') || msg.includes('unique')) {
      return NextResponse.json({ error: 'Department name already exists' }, { status: 409 })
    }
    console.error('❌ Error updating department:', error)
    return NextResponse.json({ error: error?.message || 'Failed to update department' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(request, context)
}

