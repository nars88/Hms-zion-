import { NextResponse } from 'next/server'
import { VisitStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getRequestUser, forbidden, unauthorized } from '@/lib/apiAuth'
import { logEmergencyActivity } from '@/lib/emergencyActivity'

export const dynamic = 'force-dynamic'

/** ER Vitals Station: BP, Temp, HR, SpO₂ → Vitals row + visit WITH_DOCTOR (referred to physician) */
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

    const visitRows = await prisma.$queryRaw<Array<{ id: string; notes: string | null; bedNumber: number | null }>>`
      SELECT "id", "notes", "bedNumber"
      FROM "visits"
      WHERE "id" = ${visitId}
        AND "patientId" = ${patientId}
        AND (
          "status" = CAST(${String(VisitStatus.REGISTERED)} AS "VisitStatus")
          OR "chiefComplaint" ILIKE ${'%Emergency%'}
          OR "chiefComplaint" ILIKE ${'%ER%'}
        )
      LIMIT 1
    `
    const visit = visitRows[0] ?? null
    if (!visit) {
      return NextResponse.json({ error: 'ER visit not found.' }, { status: 404 })
    }
    // Ensure incoming ER patient can be rendered on Doctor Bed Grid immediately.
    let assignedBedNumber = visit.bedNumber ?? null
    if (assignedBedNumber == null) {
      const occupiedRows = await prisma.$queryRaw<Array<{ bedNumber: number | null }>>`
        SELECT "bedNumber"
        FROM "visits"
        WHERE "id" <> ${visitId}
          AND "bedNumber" IS NOT NULL
          AND "status" NOT IN (
            CAST(${String(VisitStatus.Discharged)} AS "VisitStatus"),
            CAST(${String(VisitStatus.COMPLETED)} AS "VisitStatus")
          )
      `
      const occupied = new Set(
        occupiedRows
          .map((r) => r.bedNumber)
          .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
      )
      for (let bed = 1; bed <= 12; bed += 1) {
        if (!occupied.has(bed)) {
          assignedBedNumber = bed
          break
        }
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

    await prisma.$transaction(async (tx) => {
      await tx.vitals.create({
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
      })

      const allocatedBedNumber: number | null =
        typeof assignedBedNumber === 'number' && Number.isFinite(assignedBedNumber)
          ? assignedBedNumber
          : null

      await tx.$executeRaw`
        UPDATE "visits"
        SET
          "status" = CAST(${String(VisitStatus.WITH_DOCTOR)} AS "VisitStatus"),
          "bedNumber" = COALESCE(${allocatedBedNumber}, "bedNumber"),
          "notes" = ${nextNotes},
          "updatedAt" = ${new Date()}
        WHERE "id" = ${visitId}
      `
    })

    await logEmergencyActivity({
      visitId,
      action: 'Vitals Recorded',
      details: `BP ${bp.trim()} · Temp ${temperature}°C · HR ${heartRate} · SpO₂ ${spo2}%`,
      actorUserId: user.id,
      actorName: (user as { name?: string }).name ?? user.role,
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('emergency/vitals-entry failed:', error)
    return NextResponse.json({ error: 'Failed to save vitals.' }, { status: 500 })
  }
}
