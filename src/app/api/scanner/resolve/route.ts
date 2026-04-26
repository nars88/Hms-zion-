import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')?.trim()

  if (!code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 })
  }

  // 0. Reception badge QR (JSON payload)
  if (code.startsWith('{')) {
    try {
      const j = JSON.parse(code) as {
        type?: string
        patientId?: string
        visitId?: string
      }
      if (
        (j.type === 'ZION_ER_BADGE' || j.type === 'ZION_PATIENT_BADGE') &&
        typeof j.patientId === 'string' &&
        j.patientId.trim()
      ) {
        const patient = await prisma.patient.findUnique({
          where: { id: j.patientId.trim() },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            visits: {
              where: {
                status: { not: 'Discharged' },
                OR: [
                  { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' } },
                  { chiefComplaint: { contains: 'ER', mode: 'insensitive' } },
                ],
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true },
            },
          },
        })
        if (patient) {
          let visitId: string | null = patient.visits[0]?.id ?? null
          if (typeof j.visitId === 'string' && j.visitId.trim()) {
            const v = await prisma.visit.findFirst({
              where: {
                id: j.visitId.trim(),
                patientId: patient.id,
                status: { not: 'Discharged' },
                OR: [
                  { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' } },
                  { chiefComplaint: { contains: 'ER', mode: 'insensitive' } },
                ],
              },
              select: { id: true },
            })
            if (v) visitId = v.id
          }
          return NextResponse.json({
            type: 'badge',
            patientId: patient.id,
            visitId,
            patientName: `${patient.firstName} ${patient.lastName}`.trim(),
          })
        }
      }
    } catch {
      /* fall through */
    }
  }

  // 1. Try as patientId directly
  const byPatientId = await prisma.patient
    .findUnique({
      where: { id: code },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        visits: {
          where: { status: { not: 'Discharged' } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true },
        },
      },
    })
    .catch(() => null)

  if (byPatientId) {
    return NextResponse.json({
      type: 'patient',
      patientId: byPatientId.id,
      visitId: byPatientId.visits[0]?.id ?? null,
      patientName: `${byPatientId.firstName} ${byPatientId.lastName}`.trim(),
    })
  }

  // 2. Try as visitId
  const byVisitId = await prisma.visit
    .findUnique({
      where: { id: code },
      select: {
        id: true,
        patientId: true,
        patient: {
          select: { firstName: true, lastName: true },
        },
      },
    })
    .catch(() => null)

  if (byVisitId) {
    return NextResponse.json({
      type: 'visit',
      patientId: byVisitId.patientId,
      visitId: byVisitId.id,
      patientName: byVisitId.patient
        ? `${byVisitId.patient.firstName} ${byVisitId.patient.lastName}`.trim()
        : 'Patient',
    })
  }

  // 3. Try as bill QR code
  const byBill = await prisma.bill
    .findFirst({
      where: { qrCode: code },
      select: {
        visitId: true,
        patientId: true,
        patient: {
          select: { firstName: true, lastName: true },
        },
      },
    })
    .catch(() => null)

  if (byBill) {
    return NextResponse.json({
      type: 'bill',
      patientId: byBill.patientId,
      visitId: byBill.visitId,
      patientName: byBill.patient
        ? `${byBill.patient.firstName} ${byBill.patient.lastName}`.trim()
        : 'Patient',
    })
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
