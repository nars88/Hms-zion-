import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'
import { forbiddenClinicalAccess, isClinicalAccessAllowed } from '@/lib/rbacClinical'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['DOCTOR', 'ADMIN'].includes(user.role)) return forbidden()
    if (!isClinicalAccessAllowed(user.role)) {
      return forbiddenClinicalAccess(user, request)
    }

    const body = (await request.json().catch(() => ({}))) as {
      visitId?: string
      doctorImpression?: string
      finalDiagnosis?: string
    }
    const { visitId, doctorImpression, finalDiagnosis } = body
    if (!visitId) {
      return NextResponse.json({ error: 'visitId is required' }, { status: 400 })
    }

    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, notes: true },
    })
    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    let parsed: Record<string, unknown> = {}
    try {
      if (visit.notes) parsed = JSON.parse(visit.notes) as Record<string, unknown>
    } catch (_) {}

    const updatedNotes = JSON.stringify({
      ...parsed,
      doctorImpression: doctorImpression?.trim() || '',
      finalDiagnosis: finalDiagnosis?.trim() || '',
      archivedAt: new Date().toISOString(),
      archiveState: 'ARCHIVED',
    })

    await prisma.visit.update({
      where: { id: visitId },
      data: {
        status: VisitStatus.COMPLETED,
        finalDisposition: 'ARCHIVED',
        diagnosis: finalDiagnosis?.trim() || null,
        notes: updatedNotes,
        dischargeDate: new Date(),
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const err = e as Error
    return NextResponse.json({ error: err?.message || 'Failed to complete case' }, { status: 500 })
  }
}
