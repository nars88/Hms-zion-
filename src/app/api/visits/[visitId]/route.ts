import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UserRole, VisitStatus } from '@prisma/client'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'
import { forbiddenClinicalAccess, isClinicalAccessAllowed } from '@/lib/rbacClinical'

export const dynamic = 'force-dynamic'

// GET /api/visits/[visitId]
// Get visit details including follow-up status
export async function GET(
  request: Request,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!isClinicalAccessAllowed(user.role)) {
      return forbiddenClinicalAccess(user, request)
    }

    const { visitId } = await params
    const rows = await prisma.$queryRaw<
      Array<{
        id: string
        patientId: string
        doctorId: string | null
        status: string
        bedNumber: number | null
        chiefComplaint: string | null
        diagnosis: string | null
        prescription: string | null
        notes: string | null
        visitDate: Date
        dischargeDate: Date | null
        createdAt: Date
        updatedAt: Date
        patient_first_name: string | null
        patient_last_name: string | null
        patient_dob: Date | null
        patient_gender: string | null
        patient_phone: string | null
        doctor_name: string | null
        doctor_email: string | null
        doctor_role: string | null
      }>
    >`
      SELECT
        v."id",
        v."patientId",
        v."doctorId",
        v."status"::text AS "status",
        v."bedNumber",
        v."chiefComplaint",
        v."diagnosis",
        v."prescription",
        v."notes",
        v."visitDate",
        v."dischargeDate",
        v."createdAt",
        v."updatedAt",
        p."firstName" AS "patient_first_name",
        p."lastName" AS "patient_last_name",
        p."dateOfBirth" AS "patient_dob",
        p."gender" AS "patient_gender",
        p."phone" AS "patient_phone",
        d."name" AS "doctor_name",
        d."email" AS "doctor_email",
        d."role"::text AS "doctor_role"
      FROM "visits" v
      LEFT JOIN "patients" p ON p."id" = v."patientId"
      LEFT JOIN "users" d ON d."id" = v."doctorId"
      WHERE v."id" = ${visitId}
      LIMIT 1
    `
    const row = rows[0] ?? null

    if (!row) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      )
    }

    const visit = {
      id: row.id,
      patientId: row.patientId,
      doctorId: row.doctorId,
      status: row.status,
      bedNumber: row.bedNumber,
      chiefComplaint: row.chiefComplaint,
      diagnosis: row.diagnosis,
      prescription: row.prescription,
      notes: row.notes,
      visitDate: row.visitDate,
      dischargeDate: row.dischargeDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      patient: {
        id: row.patientId,
        firstName: row.patient_first_name,
        lastName: row.patient_last_name,
        dateOfBirth: row.patient_dob,
        gender: row.patient_gender,
        phone: row.patient_phone,
      },
      doctor: row.doctorId
        ? {
            id: row.doctorId,
            name: row.doctor_name,
            email: row.doctor_email,
            role: row.doctor_role,
          }
        : null,
    }

    return NextResponse.json({
      success: true,
      visit,
    })
  } catch (error: any) {
    console.error('❌ Error fetching visit:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch visit' },
      { status: 500 }
    )
  }
}

// PATCH /api/visits/[visitId] - update status and/or chiefComplaint, notes
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()

    const clinicalStaff = ['DOCTOR', 'INTAKE_NURSE', 'ER_INTAKE_NURSE', 'ER_NURSE']
    const metadataOnly =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.ACCOUNTANT
    const allowed = clinicalStaff.includes(user.role) || metadataOnly
    if (!allowed) return forbidden()

    const { visitId } = await params
    const body = await request.json()
    const { status, chiefComplaint, notes, bedNumber } = body

    if (metadataOnly && (chiefComplaint !== undefined || notes !== undefined)) {
      return forbiddenClinicalAccess(user, request)
    }

    const data: {
      status?: VisitStatus
      chiefComplaint?: string
      notes?: string
      bedNumber?: number | null
      updatedAt: Date
    } = { updatedAt: new Date() }
    if (status !== undefined) {
      const valid = Object.values(VisitStatus).includes(status)
      if (!valid) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      data.status = status as VisitStatus
    }
    if (!metadataOnly && chiefComplaint !== undefined) data.chiefComplaint = chiefComplaint
    if (!metadataOnly && notes !== undefined) data.notes = notes
    if (bedNumber !== undefined) {
      if (bedNumber !== null && (typeof bedNumber !== 'number' || !Number.isInteger(bedNumber) || bedNumber < 1)) {
        return NextResponse.json({ error: 'bedNumber must be a positive integer or null' }, { status: 400 })
      }
      data.bedNumber = bedNumber
    }
    const notesToStore = metadataOnly ? null : data.notes ?? null
    const chiefComplaintToStore = metadataOnly ? null : data.chiefComplaint ?? null
    const bedNumberToStore = data.bedNumber ?? null
    const statusToStore = data.status ?? null
    const updatedAt = data.updatedAt

    await prisma.$executeRaw`
      UPDATE "visits"
      SET
        "status" = COALESCE(CAST(${statusToStore} AS "VisitStatus"), "status"),
        "chiefComplaint" = COALESCE(${chiefComplaintToStore}, "chiefComplaint"),
        "notes" = COALESCE(${notesToStore}, "notes"),
        "bedNumber" = COALESCE(${bedNumberToStore}, "bedNumber"),
        "updatedAt" = ${updatedAt}
      WHERE "id" = ${visitId}
    `

    const visit = {
      id: visitId,
      status: statusToStore ?? null,
      chiefComplaint: chiefComplaintToStore,
      notes: notesToStore,
      bedNumber: bedNumberToStore,
      updatedAt,
    }
    return NextResponse.json({ success: true, visit })
  } catch (error: any) {
    console.error('❌ Error updating visit:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update visit' },
      { status: 500 }
    )
  }
}

