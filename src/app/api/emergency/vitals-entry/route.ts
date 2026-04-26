import { NextResponse } from 'next/server'
import { VisitStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getRequestUser, forbidden, unauthorized } from '@/lib/apiAuth'
import { logEmergencyActivity } from '@/lib/emergencyActivity'

export const dynamic = 'force-dynamic'

/** ER Vitals Station: BP, Temp, HR, SpO₂ → Vitals row + visit WAITING_FOR_DOCTOR */
export async function POST(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['ER_INTAKE_NURSE', 'ADMIN'].includes(user.role)) return forbidden()

    const body = (await request.json()) as {
      patientId?: string
      visitId?: string
      bp?: string
      temperature?: number
      heartRate?: number
      spo2?: number
      weight?: number
      painScale?: number | string
      isCritical?: boolean
    }

    const patientId = body.patientId
    const visitId = body.visitId
    const bp = body.bp

    if (!patientId || !visitId || !bp) {
      return NextResponse.json({ error: 'patientId, visitId, and bp are required.' }, { status: 400 })
    }
    if (
      typeof body.temperature !== 'number' ||
      !Number.isFinite(body.temperature) ||
      typeof body.heartRate !== 'number' ||
      !Number.isFinite(body.heartRate) ||
      typeof body.spo2 !== 'number' ||
      !Number.isFinite(body.spo2)
    ) {
      return NextResponse.json({ error: 'temperature, heartRate, and spo2 are required numbers.' }, { status: 400 })
    }

    const temperature = body.temperature
    const heartRate = Math.round(body.heartRate)
    const spo2 = body.spo2
    const weight = typeof body.weight === 'number' && Number.isFinite(body.weight) ? body.weight : 0

    const bpRegex = /^\d{2,3}\/\d{2,3}$/
    if (!bpRegex.test(bp.trim())) {
      return NextResponse.json(
        { error: "Blood pressure must be like 120/80." },
        { status: 400 }
      )
    }
    if (temperature < 35 || temperature > 42) {
      return NextResponse.json({ error: 'Temperature 35–42 °C.' }, { status: 400 })
    }
    if (spo2 < 50 || spo2 > 100) {
      return NextResponse.json({ error: 'SpO₂ 50–100%.' }, { status: 400 })
    }

    const visit = await prisma.visit.findFirst({
      where: {
        id: visitId,
        patientId,
        OR: [
          { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' } },
          { chiefComplaint: { contains: 'ER', mode: 'insensitive' } },
        ],
      },
    })
    if (!visit) {
      return NextResponse.json({ error: 'ER visit not found.' }, { status: 404 })
    }
    // Ensure incoming ER patient can be rendered on Doctor Bed Grid immediately.
    // If the visit has no bed yet, auto-assign first available ER bed.
    let assignedBedNumber = visit.bedNumber ?? null
    if (assignedBedNumber == null) {
      const occupiedBeds = await prisma.visit.findMany({
        where: {
          id: { not: visit.id },
          bedNumber: { not: null },
          status: { notIn: [VisitStatus.Discharged, VisitStatus.COMPLETED] },
          OR: [
            { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' } },
            { chiefComplaint: { contains: 'ER', mode: 'insensitive' } },
          ],
        },
        select: { bedNumber: true },
      })
      const occupied = new Set(
        occupiedBeds
          .map((b) => b.bedNumber)
          .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
      )
      for (let bed = 1; bed <= 12; bed += 1) {
        if (!occupied.has(bed)) {
          assignedBedNumber = bed
          break
        }
      }
      if (assignedBedNumber == null) {
        return NextResponse.json({ error: 'No ER beds available. Free a bed first.' }, { status: 409 })
      }
    }

    const painScaleRaw =
      typeof body.painScale === 'string'
        ? Number.parseInt(body.painScale, 10)
        : typeof body.painScale === 'number'
          ? body.painScale
          : null
    const painScale =
      typeof painScaleRaw === 'number' && Number.isFinite(painScaleRaw)
        ? Math.max(1, Math.min(10, Math.round(painScaleRaw)))
        : null

    let nextNotes = visit.notes || '{}'
    try {
      const parsed = visit.notes ? (JSON.parse(visit.notes) as Record<string, unknown>) : {}
      nextNotes = JSON.stringify({
        ...parsed,
        erVitalsStationAt: new Date().toISOString(),
        erVitalsStationBy: user.id,
        erVitalsRecordingSource: 'ER-Vitals',
        visit_status: 'PENDING_DOCTOR',
        ...(painScale != null
          ? { erPainScale: painScale }
          : {}),
        ...(body.isCritical === true
          ? {
              erCriticalAlert: true,
              erCriticalAlertAt: new Date().toISOString(),
            }
          : {}),
      })
    } catch {
      nextNotes = JSON.stringify({
        previousNotes: visit.notes,
        erVitalsStationAt: new Date().toISOString(),
        erVitalsStationBy: user.id,
        erVitalsRecordingSource: 'ER-Vitals',
        visit_status: 'PENDING_DOCTOR',
        ...(painScale != null
          ? { erPainScale: painScale }
          : {}),
        ...(body.isCritical === true
          ? {
              erCriticalAlert: true,
              erCriticalAlertAt: new Date().toISOString(),
            }
          : {}),
      })
    }

    await prisma.$transaction([
      prisma.vitals.create({
        data: {
          patientId,
          visitId,
          bp: bp.trim(),
          temperature,
          heartRate,
          weight,
          spo2,
          recordedBy: user.id,
          recordingSource: 'ER-Vitals',
        },
      }),
      prisma.visit.update({
        where: { id: visitId },
        data: {
          status: VisitStatus.WAITING_FOR_DOCTOR,
          bedNumber: assignedBedNumber,
          notes: nextNotes,
          updatedAt: new Date(),
        },
      }),
    ])

    await logEmergencyActivity({
      visitId,
      action: 'Vitals Recorded',
      details: `BP ${bp.trim()} · Temp ${temperature}°C · HR ${heartRate} · SpO₂ ${spo2}%`,
      actorUserId: user.id,
      actorName: (user as { name?: string }).name ?? user.role,
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to save vitals.' }, { status: 500 })
  }
}
