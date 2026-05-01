import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getRequestUser, forbidden, unauthorized } from '@/lib/apiAuth'
import { VisitStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['ER_INTAKE_NURSE', 'ADMIN', 'DOCTOR'].includes(user.role)) return forbidden()

    const start = new Date()
    start.setHours(0, 0, 0, 0)

    const rows = await prisma.$queryRaw<
      Array<{
        visitId: string
        patientId: string
        firstName: string | null
        lastName: string | null
        referredAt: Date
        status: string
      }>
    >`
      SELECT
        v."id" AS "visitId",
        v."patientId" AS "patientId",
        p."firstName" AS "firstName",
        p."lastName" AS "lastName",
        v."updatedAt" AS "referredAt",
        v."status"::text AS "status"
      FROM "visits" v
      LEFT JOIN "patients" p ON p."id" = v."patientId"
      WHERE v."status" = CAST(${String(VisitStatus.WITH_DOCTOR)} AS "VisitStatus")
        AND v."updatedAt" >= ${start}
        AND (
          v."chiefComplaint" ILIKE ${'%Emergency%'}
          OR v."chiefComplaint" ILIKE ${'%ER%'}
          OR v."notes" ILIKE ${'%"visitType":"ER"%'}
        )
      ORDER BY v."updatedAt" DESC
      LIMIT 100
    `

    return NextResponse.json({
      referrals: rows.map((r) => ({
        visitId: r.visitId,
        patientId: r.patientId,
        patientName: `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim() || 'Patient',
        referralTime: r.referredAt,
        statusLabel: r.status === 'WITH_DOCTOR' ? 'Referred to Doctor' : r.status,
      })),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load referrals'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
