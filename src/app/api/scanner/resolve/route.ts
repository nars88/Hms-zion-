import { NextResponse } from 'next/server'
import { VisitStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyBadgePayload } from '@/lib/erQr'

const ACTIVE_ER_VISIT_OR = [
  { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' as const } },
  { chiefComplaint: { contains: 'ER', mode: 'insensitive' as const } },
  { status: VisitStatus.REGISTERED },
  { status: VisitStatus.WITH_DOCTOR },
  { status: VisitStatus.WAITING_FOR_DOCTOR },
] as const

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')?.trim()
  const visitLikeId = /^(ZION|ER)-\d{8}-\d{4}$/i.test(code || '')

  if (!code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 })
  }

  // 0. Reception badge QR (JSON payload)
  if (code.startsWith('{')) {
    try {
      const parsed = JSON.parse(code) as unknown
      const badge = verifyBadgePayload(parsed)
      if (badge) {
        const visit = await prisma.visit.findFirst({
          where: {
            id: badge.visitId,
            patientId: badge.patientId,
            status: { not: 'Discharged' },
          },
          select: {
            id: true,
            patientId: true,
            patient: { select: { firstName: true, lastName: true } },
          },
        })
        if (visit) {
          return NextResponse.json({
            type: 'badge',
            patientId: visit.patientId,
            visitId: visit.id,
            patientName: `${visit.patient?.firstName ?? ''} ${visit.patient?.lastName ?? ''}`.trim(),
          })
        }
      }

      const j = parsed as {
        type?: string
        patientId?: string
        visitId?: string
        badgeId?: string
      }
      if (j.type === 'ZION_PATIENT_BADGE' && typeof j.patientId === 'string' && j.patientId.trim()) {
        const patient = await prisma.patient.findUnique({
          where: { id: j.patientId.trim() },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            visits: {
              where: {
                status: { not: 'Discharged' },
                OR: [...ACTIVE_ER_VISIT_OR],
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
                OR: [...ACTIVE_ER_VISIT_OR],
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

      if (typeof j.badgeId === 'string' && j.badgeId.trim()) {
        const badgeCode = j.badgeId.trim()
        const byBadge = await prisma.bill.findFirst({
          where: { qrCode: badgeCode },
          select: {
            visitId: true,
            patientId: true,
            patient: { select: { firstName: true, lastName: true } },
          },
        })
        if (byBadge) {
          return NextResponse.json({
            type: 'badge',
            patientId: byBadge.patientId,
            visitId: byBadge.visitId,
            patientName: byBadge.patient
              ? `${byBadge.patient.firstName} ${byBadge.patient.lastName}`.trim()
              : 'Patient',
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

  // 2.b Try public/printed visitId formats (e.g. ZION-YYYYMMDD-0001) stored in notes/badge metadata.
  if (visitLikeId) {
    const byVisitPublicId = await prisma.visit
      .findFirst({
        where: {
          status: { not: 'Discharged' },
          OR: [{ notes: { contains: code! } }],
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          patientId: true,
          patient: {
            select: { firstName: true, lastName: true },
          },
        },
      })
      .catch(() => null)

    if (byVisitPublicId) {
      return NextResponse.json({
        type: 'visit',
        patientId: byVisitPublicId.patientId,
        visitId: byVisitPublicId.id,
        patientName: byVisitPublicId.patient
          ? `${byVisitPublicId.patient.firstName} ${byVisitPublicId.patient.lastName}`.trim()
          : 'Patient',
      })
    }
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
