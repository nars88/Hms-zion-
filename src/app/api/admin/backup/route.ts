import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestUser, unauthorized, forbidden } from '@/lib/apiAuth'
import { writeAuditLog } from '@/lib/auditLog'

export const dynamic = 'force-dynamic'

type DepartmentRow = {
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

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (user.role !== 'ADMIN') return forbidden()

    const USER_BACKUP_SELECT = {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      address: true,
      education: true,
      experience: true,
      createdAt: true,
      updatedAt: true,
      departmentId: true,
    } as const

    const [users, patients, visits, departments, bills] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'asc' },
        select: USER_BACKUP_SELECT,
      }),
      prisma.patient.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.visit.findMany({ orderBy: { visitDate: 'asc' } }),
      prisma.$queryRawUnsafe<DepartmentRow[]>(
        `SELECT id, name, description, color, head_employee_id, hod_name, hod_tag, employee_ids, created_at
         FROM departments
         ORDER BY created_at ASC`
      ),
      prisma.bill.findMany({ orderBy: { createdAt: 'asc' } }),
    ])

    const payload = {
      meta: {
        version: 1,
        system: 'ZION MED',
        generatedAt: new Date().toISOString(),
        generatedBy: { id: user.id, name: user.name, role: user.role },
        counts: {
          users: users.length,
          patients: patients.length,
          visits: visits.length,
          departments: departments.length,
          bills: bills.length,
        },
      },
      data: {
        users,
        patients,
        visits,
        departments,
        bills,
      },
    }

    await writeAuditLog(prisma, {
      actor: user,
      request,
      action: 'Created system backup (export)',
      metadata: { counts: payload.meta.counts },
    })

    return NextResponse.json(payload)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to build backup'
    console.error('❌ Error building backup:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
