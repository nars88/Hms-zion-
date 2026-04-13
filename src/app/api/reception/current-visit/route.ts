import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

function safeJsonParse(v: unknown): any {
  if (typeof v !== 'string' || !v) return null
  try {
    return JSON.parse(v)
  } catch {
    return null
  }
}

// GET /api/reception/current-visit?patientId=...
// Returns the most recent *active* visit for a patient (no creation).
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const patientId = url.searchParams.get('patientId')?.trim()
    if (!patientId) return NextResponse.json({ error: 'patientId is required' }, { status: 400 })

    const visit = await prisma.visit.findFirst({
      where: {
        patientId,
        status: { notIn: [VisitStatus.COMPLETED, VisitStatus.Discharged] },
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, notes: true, createdAt: true, patientId: true },
    })

    if (!visit) {
      return NextResponse.json({ success: true, visit: null }, { status: 200 })
    }

    const notes = safeJsonParse(visit.notes)
    const isEmergency = notes?.visitType === 'EMERGENCY' || notes?.department === 'ER'
    const displayStatus = isEmergency ? 'EMERGENCY' : visit.status

    return NextResponse.json(
      {
        success: true,
        visit: { id: visit.id, status: visit.status, displayStatus, patientId: visit.patientId, createdAt: visit.createdAt },
      },
      { status: 200 }
    )
  } catch (e: any) {
    console.error('❌ Error fetching current visit:', e)
    return NextResponse.json({ error: e?.message || 'Failed to fetch current visit' }, { status: 500 })
  }
}

