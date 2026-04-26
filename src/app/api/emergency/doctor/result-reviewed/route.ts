import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Department = 'Lab' | 'Radiology' | 'Sonar' | 'ECG'

// POST /api/emergency/doctor/result-reviewed
// Mark diagnostic result as reviewed (stops pulse on bed card; icon stays green)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { visitId, department } = body as { visitId?: string; department?: Department }
    if (!visitId || !department || !['Lab', 'Radiology', 'Sonar', 'ECG'].includes(department)) {
      return NextResponse.json(
        { error: 'visitId and department (Lab | Radiology | Sonar | ECG) required' },
        { status: 400 }
      )
    }
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, notes: true },
    })
    if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

    let parsed: Record<string, unknown> = {}
    try {
      if (visit.notes) parsed = JSON.parse(visit.notes) as Record<string, unknown>
    } catch (_) {}
    const lastReviewedAt = (parsed.lastReviewedAt as Record<string, string>) || {}
    lastReviewedAt[department] = new Date().toISOString()
    parsed.lastReviewedAt = lastReviewedAt

    await prisma.visit.update({
      where: { id: visitId },
      data: { notes: JSON.stringify(parsed), updatedAt: new Date() },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Error marking result reviewed:', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
