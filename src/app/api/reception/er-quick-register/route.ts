import { NextResponse } from 'next/server'
import { VisitStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'
import { createErQrPayload } from '@/lib/erQr'
import { randomUUID } from 'crypto'
import { ensureErAdmissionBill } from '@/lib/billing/erAdmission'

export const dynamic = 'force-dynamic'

type Body = {
  patientName?: string
  age?: number
  chiefComplaint?: string
}

function safeTrim(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function splitName(fullName: string) {
  const normalized = fullName.trim().replace(/\s+/g, ' ')
  const parts = normalized.split(' ').filter(Boolean)
  return {
    firstName: parts[0] || normalized,
    lastName: parts.slice(1).join(' ') || '-',
    normalized,
  }
}

function resolveDob(age?: number): Date {
  const years = typeof age === 'number' && Number.isFinite(age) && age > 0 ? Math.floor(age) : 30
  const now = new Date()
  return new Date(now.getFullYear() - years, 0, 1)
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

// POST /api/reception/er-quick-register
// Standalone ER Quick Reception: simplified patient + visit + signed QR payload.
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['RECEPTIONIST', 'SECRETARY', 'ER_NURSE', 'ER_INTAKE_NURSE', 'INTAKE_NURSE', 'ADMIN'].includes(user.role)) {
      return forbidden()
    }

    const body = (await request.json().catch(() => ({}))) as Body
    const fullName = safeTrim(body.patientName)
    const complaint = safeTrim(body.chiefComplaint)
    const ageNum = typeof body.age === 'number' ? body.age : Number(body.age)
    if (!fullName) return NextResponse.json({ error: 'patientName is required' }, { status: 400 })
    if (!complaint) return NextResponse.json({ error: 'chiefComplaint is required' }, { status: 400 })
    if (!Number.isFinite(ageNum) || ageNum <= 0) {
      return NextResponse.json({ error: 'age must be a positive number' }, { status: 400 })
    }

    const { firstName, lastName } = splitName(fullName)
    const dob = resolveDob(ageNum)
    const fallbackPhone = `ER-QUICK-${Date.now()}`
    const patient = await prisma.patient.create({
      data: {
        firstName,
        lastName,
        dateOfBirth: dob,
        gender: 'Other',
        phone: fallbackPhone,
        triageLevel: 1,
      },
    })

    const publicVisitId = `ER-${Date.now()}`
    const notes = mergeNotes(null, {
      visitType: 'ER',
      registrationSource: 'ER_QUICK_RECEPTION',
      publicVisitId,
      createdAt: new Date().toISOString(),
      createdByUserId: user.id,
    })

    const visitId = randomUUID()
    const now = new Date()
    const visitCreateDataRaw = {
      id: visitId,
      patientId: patient.id,
      status: String(VisitStatus.Waiting),
      chiefComplaint: complaint,
      notes,
      visitDate: now,
      createdAt: now,
      updatedAt: now,
    }
    let visit: { id: string; status: VisitStatus }
    try {
      await prisma.$executeRaw`
        INSERT INTO "visits" ("id", "patientId", "status", "chiefComplaint", "notes", "visitDate", "createdAt", "updatedAt")
        VALUES (
          ${visitCreateDataRaw.id},
          ${visitCreateDataRaw.patientId},
          CAST(${visitCreateDataRaw.status} AS "VisitStatus"),
          ${visitCreateDataRaw.chiefComplaint},
          ${visitCreateDataRaw.notes},
          ${visitCreateDataRaw.visitDate},
          ${visitCreateDataRaw.createdAt},
          ${visitCreateDataRaw.updatedAt}
        )
      `
      visit = { id: visitId, status: VisitStatus.Waiting }
    } catch (err: any) {
      console.error('ER quick visit.create failed. payload:', visitCreateDataRaw)
      console.error('ER quick visit.create error:', err)
      throw err
    }

    const qrPayload = createErQrPayload(patient.id, visit.id)
    await ensureErAdmissionBill({
      visitId: visit.id,
      patientId: patient.id,
      generatedBy: user.id,
    })

    return NextResponse.json(
      {
        success: true,
        patientType: 'ER',
        patient: {
          id: patient.id,
          name: `${patient.firstName} ${patient.lastName}`.trim(),
          phone: patient.phone,
        },
        visit: {
          id: visit.id,
          status: visit.status,
          publicVisitId,
          queueStatus: 'ER_WAITING',
        },
        qrPayload,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('er-quick-register failed', error)
    return NextResponse.json({ error: 'Failed to save patient and visit' }, { status: 500 })
  }
}
