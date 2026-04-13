import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')?.trim()

  if (!code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 })
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
