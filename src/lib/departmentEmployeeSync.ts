import { prisma } from '@/lib/prisma'

export function parseEmployeeIds(value: unknown): string[] {
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

/** Removes user from every department's employee_ids, sets users.department_id, then appends to target department's JSON array. */
export async function syncUserDepartmentLink(userId: string, newDepartmentId: string | null) {
  await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRawUnsafe<Array<{ id: string; employee_ids: unknown }>>(
      `SELECT id, employee_ids FROM departments`
    )
    for (const row of rows) {
      const ids = parseEmployeeIds(row.employee_ids)
      if (!ids.includes(userId)) continue
      const next = ids.filter((id) => id !== userId)
      await tx.$executeRawUnsafe(
        `UPDATE departments SET employee_ids = $1::jsonb WHERE id = $2`,
        JSON.stringify(next),
        row.id
      )
    }

    await tx.$executeRawUnsafe(
      `UPDATE users SET department_id = $1 WHERE id = $2`,
      newDepartmentId,
      userId
    )

    if (newDepartmentId) {
      const target = await tx.$queryRawUnsafe<Array<{ employee_ids: unknown }>>(
        `SELECT employee_ids FROM departments WHERE id = $1`,
        newDepartmentId
      )
      const ids = parseEmployeeIds(target[0]?.employee_ids)
      if (!ids.includes(userId)) {
        ids.push(userId)
        await tx.$executeRawUnsafe(
          `UPDATE departments SET employee_ids = $1::jsonb WHERE id = $2`,
          JSON.stringify(ids),
          newDepartmentId
        )
      }
    }
  })
}

export async function verifyDepartmentExists(departmentId: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM departments WHERE id = $1 LIMIT 1`,
    departmentId
  )
  return rows.length > 0
}
