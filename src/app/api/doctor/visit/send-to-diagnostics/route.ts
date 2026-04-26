import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import { getRequestUser, unauthorized, forbidden } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

// Moves a Visit into the "PENDING_RESULTS" phase (mapped to OUT_FOR_TEST
// in the existing Prisma VisitStatus enum). Lab / Radiology dashboards read
// this status; the active doctor queue explicitly excludes it, so the
// patient drops off the doctor's queue automatically.
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['DOCTOR', 'ADMIN'].includes(user.role)) return forbidden()

    const body = (await request.json().catch(() => ({}))) as { visitId?: string }
    const visitId = body.visitId?.trim()
    if (!visitId) {
      return NextResponse.json({ error: 'visitId is required' }, { status: 400 })
    }

    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, status: true },
    })
    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }
    if (visit.status === VisitStatus.COMPLETED || visit.status === VisitStatus.Discharged) {
      return NextResponse.json(
        { error: 'Cannot move a completed or discharged visit' },
        { status: 409 }
      )
    }

    await prisma.visit.update({
      where: { id: visitId },
      data: {
        status: VisitStatus.OUT_FOR_TEST,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, status: VisitStatus.OUT_FOR_TEST })
  } catch (e: unknown) {
    const err = e as Error
    console.error('❌ Error sending visit to diagnostics:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to send to diagnostics' },
      { status: 500 }
    )
  }
}
