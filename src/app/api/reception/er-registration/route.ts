import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import { createErQrPayload } from '@/lib/erQr'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

type Body = {
  fullName: string
  age: number
  phone?: string
}

function safeTrim(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function mergeNotes(existing: string | null, patch: Record<string, unknown>) {
  let parsed: Record<string, unknown> = {}
  try {
    if (existing) parsed = JSON.parse(existing) as Record<string, unknown>
  } catch {
    parsed = {}
  }
  return JSON.stringify({ ...parsed, ...patch })
}

// POST /api/reception/er-registration
// Creates/updates Patient and creates an ER Visit marked with visitType=EMERGENCY in Visit.notes.
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['RECEPTIONIST', 'RECEPTION', 'ADMIN'].includes(user.role)) return forbidden()

    const body = (await request.json().catch(() => ({}))) as Partial<Body>

    const fullName = safeTrim(body.fullName)
    const age = typeof body.age === 'number' ? body.age : Number(body.age)
    const phoneIn = safeTrim(body.phone)

    if (!fullName || !Number.isFinite(age) || age <= 0) {
      return NextResponse.json(
        { error: 'fullName and age are required' },
        { status: 400 }
      )
    }

    const parts = fullName.split(/\s+/).filter(Boolean)
    const firstName = parts[0] || fullName
    const lastName = parts.slice(1).join(' ') || '-'
    const now = new Date()
    const birthYear = now.getFullYear() - Math.floor(age)
    const dateOfBirth = new Date(birthYear, 0, 1)
    const gender: 'Other' = 'Other'
    const phone = phoneIn || `ER-${Date.now()}`

    const existing = await prisma.patient.findFirst({ where: { phone } })
    const patient = existing
      ? await prisma.patient.update({
          where: { id: existing.id },
          data: {
            firstName,
            lastName,
            dateOfBirth,
            gender,
            phone,
            triageLevel: 1,
          },
        })
      : await prisma.patient.create({
          data: {
            firstName,
            lastName,
            dateOfBirth,
            gender,
            phone,
            triageLevel: 1,
          },
        })

    const notes = mergeNotes(null, {
      department: 'ER',
      visitType: 'EMERGENCY',
      registrationSource: 'RECEPTION_ER',
      createdAt: new Date().toISOString(),
    })

    const visit = await prisma.visit.create({
      data: {
        patientId: patient.id,
        status: VisitStatus.Waiting,
        chiefComplaint: 'Emergency',
        notes,
      },
      select: { id: true, status: true, patientId: true, notes: true },
    })

    const qrPayload = createErQrPayload(patient.id, visit.id)

    return NextResponse.json(
      {
        success: true,
        patient: {
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
          phone: patient.phone,
          name: `${patient.firstName} ${patient.lastName}`.trim(),
        },
        visit: {
          id: visit.id,
          status: visit.status,
        },
        qrPayload,
      },
      { status: 201 }
    )
  } catch (e: unknown) {
    const err = e as Error
    console.error('❌ Error in ER registration route:', err)
    return NextResponse.json({ error: err?.message || 'Failed to register ER patient' }, { status: 500 })
  }
}

