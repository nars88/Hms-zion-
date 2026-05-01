import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import { randomUUID } from 'crypto'
import { ensureErAdmissionBill } from '@/lib/billing/erAdmission'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    const visits = await prisma.visit.findMany({
      where: {
        visitDate: { gte: start, lt: end },
        chiefComplaint: { startsWith: 'Emergency - ' },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        patientId: true,
        createdAt: true,
        patient: { select: { firstName: true, lastName: true } },
      },
      take: 50,
    })

    return NextResponse.json({
      patients: visits.map((v) => ({
        visitId: v.id,
        patientId: v.patientId,
        name: `${v.patient.firstName} ${v.patient.lastName}`.trim(),
        createdAt: v.createdAt,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load today list' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['RECEPTIONIST', 'RECEPTION', 'ADMIN'].includes(user.role)) return forbidden()

    const body = await request.json()
    const { firstName, lastName, age, gender, phone, chiefComplaint } = body

    if (!firstName || !age || !chiefComplaint) {
      return NextResponse.json(
        { error: 'firstName, age, and chiefComplaint are required' },
        { status: 400 }
      )
    }

    // Calculate date of birth from age
    const birthYear = new Date().getFullYear() - parseInt(age)
    const dateOfBirth = new Date(birthYear, 0, 1)

    // Create patient
    const patient = await prisma.patient.create({
      data: {
        firstName: firstName.trim(),
        lastName: (lastName || '—').trim(),
        dateOfBirth,
        gender: gender || 'Male',
        phone: phone || '0000000000',
      },
    })

    // Create ER visit — chiefComplaint includes "Emergency" so it appears in ER queues
    // Use raw insert to avoid touching columns not present in the live DB.
    const visitId = randomUUID()
    const now = new Date()
    const visitCreateData = {
      id: visitId,
      patientId: patient.id,
      status: String(VisitStatus.Waiting),
      chiefComplaint: `Emergency - ${chiefComplaint.trim()}`,
      notes: JSON.stringify({
        registrationSource: 'ER_RECEPTION',
        createdAt: now.toISOString(),
      }),
      visitDate: now,
      createdAt: now,
      updatedAt: now,
    }
    try {
      await prisma.$executeRaw`
        INSERT INTO "visits" ("id", "patientId", "status", "chiefComplaint", "notes", "visitDate", "createdAt", "updatedAt")
        VALUES (
          ${visitCreateData.id},
          ${visitCreateData.patientId},
          CAST(${visitCreateData.status} AS "VisitStatus"),
          ${visitCreateData.chiefComplaint},
          ${visitCreateData.notes},
          ${visitCreateData.visitDate},
          ${visitCreateData.createdAt},
          ${visitCreateData.updatedAt}
        )
      `
    } catch (err: any) {
      console.error('ER reception visit insert failed. payload:', visitCreateData)
      console.error('ER reception visit insert error:', err)
      throw err
    }

    const billOwner =
      (await prisma.user.findFirst({
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      })) ?? null
    if (!billOwner?.id) {
      return NextResponse.json({ error: 'Cannot create ER invoice: no billing user found.' }, { status: 500 })
    }
    await ensureErAdmissionBill({
      visitId,
      patientId: patient.id,
      generatedBy: billOwner.id,
    })

    return NextResponse.json({
      success: true,
      patientId: patient.id,
      visitId,
      patientName: `${firstName} ${lastName || ''}`.trim(),
    })
  } catch (e: any) {
    console.error('ER Registration error:', e)
    return NextResponse.json(
      { error: e?.message || 'Registration failed' },
      { status: 500 }
    )
  }
}
