import { NextResponse } from 'next/server'
import { VisitStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'
import { createErQrPayload } from '@/lib/erQr'
import { ER_ADMISSION_SERVICE_CODE, resolveErAdmissionFee } from '@/lib/billing/erAdmission'

export const dynamic = 'force-dynamic'

type RegisterVisitBody = {
  patientType?: 'ER' | 'CLINIC'
  fullName?: string
  gender?: 'Male' | 'Female' | 'Other'
  phone?: string
  dateOfBirth?: string
  age?: number
  chiefComplaint?: string
  createInvoice?: boolean
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

function resolveDob(dateOfBirth?: string, age?: number): Date {
  if (dateOfBirth) {
    const parsed = new Date(dateOfBirth)
    if (!Number.isNaN(parsed.getTime())) return parsed
  }
  const years = typeof age === 'number' && Number.isFinite(age) && age > 0 ? Math.floor(age) : 30
  const now = new Date()
  return new Date(now.getFullYear() - years, 0, 1)
}

function isoDateKey(date: Date) {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}${m}${d}`
}

function buildPublicVisitId(kind: 'ER' | 'CLINIC', keyDate: string, sequence: number) {
  const prefix = kind === 'ER' ? 'ER' : 'ZION'
  return `${prefix}-${keyDate}-${String(sequence).padStart(4, '0')}`
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

// POST /api/reception/register-visit
// Atomic registration for both ER and Clinic, returns badge payload + fallback public visit id.
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['RECEPTIONIST', 'SECRETARY', 'ER_NURSE', 'ER_INTAKE_NURSE', 'INTAKE_NURSE', 'ADMIN'].includes(user.role)) {
      return forbidden()
    }

    const body = (await request.json().catch(() => ({}))) as RegisterVisitBody
    const patientType = body.patientType === 'ER' ? 'ER' : 'CLINIC'
    const fullName = safeTrim(body.fullName)
    const phone = safeTrim(body.phone)
    const gender = body.gender || 'Other'
    if (!fullName) return NextResponse.json({ error: 'fullName is required' }, { status: 400 })
    if (patientType === 'CLINIC' && !phone) {
      return NextResponse.json({ error: 'phone is required for clinic registration' }, { status: 400 })
    }

    const { firstName, lastName, normalized } = splitName(fullName)
    const dob = resolveDob(body.dateOfBirth, body.age)
    const fallbackPhone = `${patientType}-${Date.now()}`
    const resolvedPhone = phone || fallbackPhone
    const today = new Date()
    const keyDate = isoDateKey(today)
    const shouldCreateInvoice = patientType === 'ER' || body.createInvoice === true

    const result = await prisma.$transaction(async (tx) => {
      const counter = await tx.visitSequenceCounter.upsert({
        where: {
          keyDate_kind: {
            keyDate,
            kind: patientType === 'ER' ? 'ER' : 'CLINIC',
          },
        },
        update: {
          lastNumber: { increment: 1 },
        },
        create: {
          keyDate,
          kind: patientType === 'ER' ? 'ER' : 'CLINIC',
          lastNumber: 1,
        },
        select: { lastNumber: true },
      })
      const publicVisitId = buildPublicVisitId(patientType, keyDate, counter.lastNumber)

      const existing = await tx.patient.findFirst({ where: { phone: resolvedPhone } })
      const patient = existing
        ? await tx.patient.update({
            where: { id: existing.id },
            data: {
              firstName,
              lastName,
              dateOfBirth: dob,
              gender,
              phone: resolvedPhone,
              ...(patientType === 'ER' ? { triageLevel: 1 } : {}),
            },
          })
        : await tx.patient.create({
            data: {
              firstName,
              lastName,
              dateOfBirth: dob,
              gender,
              phone: resolvedPhone,
              ...(patientType === 'ER' ? { triageLevel: 1 } : {}),
            },
          })

      const notes = mergeNotes(null, {
        visitType: patientType === 'ER' ? 'EMERGENCY' : 'CLINIC',
        department: patientType === 'ER' ? 'ER' : 'CLINIC',
        queueStatus: patientType === 'ER' ? 'ER_WAITING' : 'AWAITING_SECRETARY',
        registrationSource: 'RECEPTION_SAVE_AND_ISSUE',
        publicVisitId,
        createdAt: new Date().toISOString(),
        createdByUserId: user.id,
      })

      const visit = await tx.visit.create({
        data: {
          patientId: patient.id,
          status: VisitStatus.Waiting,
          chiefComplaint:
            safeTrim(body.chiefComplaint) ||
            (patientType === 'ER' ? 'Emergency' : 'Clinic appointment'),
          notes,
        },
        select: { id: true, status: true },
      })

      if (shouldCreateInvoice) {
        const erAdmissionFee = patientType === 'ER' ? await resolveErAdmissionFee() : 0
        const initialItem = patientType === 'ER'
          ? {
              id: `ER-ADM-${visit.id}`,
              department: 'ER',
              description: 'ER Admission Fee',
              quantity: 1,
              unitPrice: erAdmissionFee,
              total: erAdmissionFee,
              addedAt: new Date().toISOString(),
              addedBy: user.id,
              sourceTaskId: null,
              serviceCode: ER_ADMISSION_SERVICE_CODE,
              billingUnit: 'PER_TASK',
            }
          : {
              id: `REG-${visit.id}`,
              department: 'CLINIC',
              description: 'Clinic Registration',
              quantity: 1,
              unitPrice: 0,
              total: 0,
              addedAt: new Date().toISOString(),
              addedBy: user.id,
              sourceTaskId: null,
              serviceCode: null,
              billingUnit: 'PER_TASK',
            }

        await tx.bill.create({
          data: {
            visitId: visit.id,
            patientId: patient.id,
            generatedBy: user.id,
            items: [initialItem],
            subtotal: erAdmissionFee,
            tax: 0,
            discount: 0,
            total: erAdmissionFee,
            paymentStatus: 'Pending',
          },
        })
      }

      return { patient, visit, publicVisitId }
    })

    const qrPayload =
      patientType === 'ER'
        ? createErQrPayload(result.patient.id, result.visit.id)
        : {
            type: 'ZION_PATIENT_BADGE',
            department: 'CLINIC',
            patientId: result.patient.id,
            visitId: result.visit.id,
            badgeId: result.publicVisitId,
            generatedAt: new Date().toISOString(),
          }

    return NextResponse.json(
      {
        success: true,
        patientType,
        patient: {
          id: result.patient.id,
          name: `${result.patient.firstName} ${result.patient.lastName}`.trim(),
          phone: result.patient.phone,
        },
        visit: {
          id: result.visit.id,
          status: result.visit.status,
          publicVisitId: result.publicVisitId,
          queueStatus: patientType === 'ER' ? 'ER_WAITING' : 'AWAITING_SECRETARY',
        },
        qrPayload,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('register-visit failed', error)
    return NextResponse.json({ error: 'Failed to save patient and visit' }, { status: 500 })
  }
}

