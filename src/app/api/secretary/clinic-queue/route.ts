import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import { getRequestUser, forbidden, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'
const SECRETARY_CLINIC_EMAIL = 'secretary@zionmed.com'

async function assertClinicQueueAccess(user: { id: string; role: string } | null) {
  if (!user) return { ok: false as const, response: unauthorized() }
  if (user.role === 'ADMIN') return { ok: true as const }
  if (user.role !== 'SECRETARY') return { ok: false as const, response: forbidden() }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true },
  })
  if ((dbUser?.email || '').toLowerCase() !== SECRETARY_CLINIC_EMAIL) {
    return { ok: false as const, response: forbidden() }
  }
  return { ok: true as const }
}

function parseNotes(notes: string | null): Record<string, unknown> {
  if (!notes) return {}
  try {
    const parsed = JSON.parse(notes) as Record<string, unknown>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

// GET /api/secretary/clinic-queue?q=...
export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request)
    const access = await assertClinicQueueAccess(user)
    if (!access.ok) return access.response

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim().toLowerCase() || ''

    const visits = await prisma.visit.findMany({
      where: {
        status: {
          in: [VisitStatus.Waiting, VisitStatus.In_Consultation],
        },
      },
      orderBy: { visitDate: 'asc' },
      select: {
        id: true,
        patientId: true,
        status: true,
        visitDate: true,
        notes: true,
        chiefComplaint: true,
        patient: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            name: true,
          },
        },
      },
    })

    const rows = visits
      .map((v) => {
        const notes = parseNotes(v.notes)
        const visitType = typeof notes.visitType === 'string' ? String(notes.visitType).toUpperCase() : 'CLINIC'
        const cc = (v.chiefComplaint || '').toLowerCase()
        const isErByComplaint = cc.includes('emergency') || cc.includes('er') || cc.includes('طوارئ')
        const isClinic = visitType === 'CLINIC' && !isErByComplaint
        if (!isClinic) return null

        const patientName = `${v.patient?.firstName ?? ''} ${v.patient?.lastName ?? ''}`.trim()
        const phone = v.patient?.phone ?? ''
        const assignedDoctor =
          v.doctor?.name ||
          (typeof notes.assignedDoctor === 'string' ? String(notes.assignedDoctor) : '') ||
          'General Clinic'

        return {
          visitId: v.id,
          fileNo: v.patientId,
          patientName,
          phone,
          assignedDoctor,
          arrivalAt: v.visitDate,
          status: v.status,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x != null)
      .filter((r) => (!q ? true : r.patientName.toLowerCase().includes(q) || r.phone.toLowerCase().includes(q)))

    return NextResponse.json(rows)
  } catch (error) {
    console.error('Error fetching secretary clinic queue:', error)
    return NextResponse.json({ error: 'Failed to fetch clinic queue' }, { status: 500 })
  }
}

// POST /api/secretary/clinic-queue { visitId } -> set IN_PROGRESS equivalent
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    const access = await assertClinicQueueAccess(user)
    if (!access.ok) return access.response

    const body = (await request.json()) as { visitId?: string }
    const visitId = body.visitId?.trim()
    if (!visitId) return NextResponse.json({ error: 'visitId is required' }, { status: 400 })

    await prisma.visit.update({
      where: { id: visitId },
      data: {
        status: VisitStatus.In_Consultation,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending patient to clinic:', error)
    return NextResponse.json({ error: 'Failed to update visit status' }, { status: 500 })
  }
}
