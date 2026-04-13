import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import type { ImagingResultRecord } from '@/lib/imagingRelease'

type Department = 'Radiology' | 'Sonar' | 'ECG'
const RESULT_KEYS = {
  Radiology: 'radiologyResults',
  Sonar: 'sonarResults',
  ECG: 'ecgResults',
} as const

// POST /api/lab/er-beds/release-imaging — technician sends reviewed imaging to the doctor
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      visitId?: string
      at?: string
      department?: Department
      technicianNotes?: string
    }
    const { visitId, at, department } = body
    const technicianNotes = typeof body.technicianNotes === 'string' ? body.technicianNotes.trim() : ''
    if (!visitId || !at || !department || !['Radiology', 'Sonar', 'ECG'].includes(department)) {
      return NextResponse.json(
        { error: 'visitId, at, and department (Radiology | Sonar | ECG) are required' },
        { status: 400 }
      )
    }

    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, notes: true, status: true, patientId: true },
    })
    if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

    let parsed: Record<string, unknown> = {}
    try {
      if (visit.notes) parsed = JSON.parse(visit.notes) as Record<string, unknown>
    } catch (_) {}

    const key = RESULT_KEYS[department]
    const list = ((parsed[key] as ImagingResultRecord[]) || []).slice()
    const idx = list.findIndex((r) => String(r.at) === String(at))
    if (idx === -1) {
      return NextResponse.json({ error: 'No imaging result found for this order' }, { status: 404 })
    }

    const releasedAt = new Date().toISOString()
    const prev = list[idx]
    list[idx] = {
      ...prev,
      technicianNotes,
      releasedToDoctorAt: releasedAt,
    }

    const erOrders = (parsed.erOrders as Array<{ at?: string; type?: string; status?: string }>) || []
    const updatedErOrders = erOrders.map((order) =>
      String(order.at) === String(at) ? { ...order, status: 'COMPLETED' } : order
    )

    const lastResultAt = (parsed.lastResultAt as Record<string, string>) || {}
    lastResultAt[department] = releasedAt

    const advanceToClinicalQueue = (
      [
        VisitStatus.Waiting,
        VisitStatus.In_Consultation,
        VisitStatus.OUT_FOR_TEST,
        VisitStatus.READY_FOR_REVIEW,
      ] as VisitStatus[]
    ).includes(visit.status)

    await prisma.visit.update({
      where: { id: visitId },
      data: {
        notes: JSON.stringify({
          ...parsed,
          erOrders: updatedErOrders,
          lastResultAt,
          [key]: list,
        }),
        ...(advanceToClinicalQueue && { status: VisitStatus.COMPLETED }),
        updatedAt: new Date(),
      },
    })

    if (department === 'Sonar') {
      const img = typeof list[idx].attachmentPath === 'string' ? list[idx].attachmentPath.trim() : ''
      await prisma.patient.update({
        where: { id: visit.patientId },
        data: {
          sonarStatus: 'COMPLETE',
          sonarImage: img || null,
          sonarNotes: technicianNotes || null,
        },
      })
    }

    return NextResponse.json({ success: true, releasedAt })
  } catch (e: unknown) {
    const err = e as Error
    console.error('release-imaging:', err)
    return NextResponse.json({ error: err?.message || 'Failed to release imaging' }, { status: 500 })
  }
}
