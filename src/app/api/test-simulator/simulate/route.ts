import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import { DEMO_RADIOLOGY_XRAY_IMAGE_URL, DEMO_SONAR_ULTRASOUND_IMAGE_URL } from '@/config/demoDiagnosticImageUrls'

type Department = 'Radiology' | 'Sonar' | 'Lab'

type ResultEntry = {
  at?: string
  testType?: string
  result: string
  completedAt?: string
  attachmentPath?: string
}

const ORDER_TYPES: Record<Department, string[]> = {
  Radiology: ['RADIOLOGY_REQUESTED'],
  Sonar: ['SONAR_REQUESTED'],
  Lab: ['LAB', 'LAB_REQUESTED'],
}

const RESULT_KEYS: Record<Department, string> = {
  Radiology: 'radiologyResults',
  Sonar: 'sonarResults',
  Lab: 'labResults',
}

const ER_VISIT_FILTER = {
  status: { not: VisitStatus.Discharged } as const,
  OR: [
    { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' as const } },
    { chiefComplaint: { contains: 'ER', mode: 'insensitive' as const } },
  ],
}

function getMockPayload(department: Department) {
  if (department === 'Radiology') {
    return {
      result: 'Chest X-Ray auto-simulated. No acute cardiopulmonary findings.',
      attachmentPath: DEMO_RADIOLOGY_XRAY_IMAGE_URL,
    }
  }
  if (department === 'Sonar') {
    return {
      result: 'Sonar auto-simulated. No significant abnormalities detected.',
      attachmentPath: DEMO_SONAR_ULTRASOUND_IMAGE_URL,
    }
  }
  return {
    result: 'HB: 14.2, WBC: 6500',
    attachmentPath: undefined,
  }
}

function parseVisitNotes(notes: string | null): Record<string, unknown> {
  if (!notes) return {}
  try {
    return JSON.parse(notes) as Record<string, unknown>
  } catch {
    return {}
  }
}

/**
 * Sonar simulator: flags the patient for ultrasound (DB + visit order).
 * Does NOT inject sonarResults — technician uploads + release-imaging completes the path to the doctor.
 */
async function simulateSonarRequest() {
  const visits = await prisma.visit.findMany({
    where: ER_VISIT_FILTER,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      notes: true,
      status: true,
      patientId: true,
      patient: { select: { firstName: true, lastName: true } },
    },
  })

  if (visits.length === 0) {
    return NextResponse.json({
      success: false,
      message: 'No ER visits found. Create an Emergency visit first, then simulate Sonar.',
    })
  }

  for (const visit of visits) {
    const parsed = parseVisitNotes(visit.notes)
    const erOrders = (parsed.erOrders as Array<{ at?: string; type?: string; content?: string; status?: string }>) || []
    const sonarResults = (parsed.sonarResults as Array<{ at?: string }>) || []

    const unfulfilled = erOrders.find((o) => {
      if (o.type !== 'SONAR_REQUESTED' || !o.at) return false
      return !sonarResults.some((r) => String(r.at) === String(o.at))
    })

    if (unfulfilled) {
      await prisma.patient.update({
        where: { id: visit.patientId },
        data: {
          sonarStatus: 'COMPLETE',
          sonarImage: DEMO_SONAR_ULTRASOUND_IMAGE_URL,
          sonarNotes:
            'Simulated sonar feed (demo). Formal study may still appear in the technician queue until released.',
        },
      })
      const patientName = visit.patient
        ? `${visit.patient.firstName} ${visit.patient.lastName}`.trim()
        : 'Patient'
      return NextResponse.json({
        success: true,
        patientName,
        visitId: visit.id,
        department: 'Sonar' as const,
        message: `Sonar queue: ${patientName} — patient sonarImage/sonarStatus updated (COMPLETE, demo).`,
      })
    }
  }

  const target = visits[0]
  const parsed = parseVisitNotes(target.notes)
  const erOrders = (parsed.erOrders as Array<{ at?: string; type?: string; content?: string; status?: string }>) || []
  const at = new Date().toISOString()
  const nextOrders = [
    ...erOrders,
    {
      type: 'SONAR_REQUESTED' as const,
      at,
      content: 'Ultrasound / Sonar',
      status: 'PENDING' as const,
    },
  ]

  await prisma.visit.update({
    where: { id: target.id },
    data: {
      notes: JSON.stringify({
        ...parsed,
        erOrders: nextOrders,
      }),
      updatedAt: new Date(),
    },
  })

  await prisma.patient.update({
    where: { id: target.patientId },
    data: {
      sonarStatus: 'COMPLETE',
      sonarImage: DEMO_SONAR_ULTRASOUND_IMAGE_URL,
      sonarNotes:
        'Simulated sonar feed (demo). Formal study may still appear in the technician queue until released.',
    },
  })

  const patientName = target.patient
    ? `${target.patient.firstName} ${target.patient.lastName}`.trim()
    : 'Patient'

  return NextResponse.json({
    success: true,
    patientName,
    visitId: target.id,
    department: 'Sonar' as const,
    message: `Sonar request created for ${patientName}. Sonar queue will show this study — technician uploads image then sends to doctor.`,
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { department?: Department }
    const department = body.department
    if (!department || !['Radiology', 'Sonar', 'Lab'].includes(department)) {
      return NextResponse.json({ error: 'department is required' }, { status: 400 })
    }

    if (department === 'Sonar') {
      return simulateSonarRequest()
    }

    const visits = await prisma.visit.findMany({
      where: ER_VISIT_FILTER,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        notes: true,
        status: true,
        patient: { select: { firstName: true, lastName: true } },
      },
    })

    let selectedVisit:
      | { id: string; notes: string | null; status: VisitStatus; patient: { firstName: string; lastName: string } | null }
      | undefined
    let selectedOrderAt: string | undefined
    let selectedTestType: string | undefined

    for (const visit of visits) {
      const parsed = parseVisitNotes(visit.notes)
      const erOrders = (parsed.erOrders as Array<{ at?: string; type?: string; content?: string }>) || []
      const results = (parsed[RESULT_KEYS[department]] as ResultEntry[]) || []
      const pending = erOrders.find((o) => {
        if (!o.at || !o.type) return false
        if (!ORDER_TYPES[department].includes(o.type)) return false
        const alreadyDone = results.some((r) => String(r.at) === String(o.at))
        return !alreadyDone
      })
      if (pending) {
        selectedVisit = visit
        selectedOrderAt = pending.at
        selectedTestType = pending.content || department
        break
      }
    }

    if (!selectedVisit || !selectedOrderAt) {
      return NextResponse.json({ success: false, message: 'No pending patient found for this device.' })
    }

    const parsed = parseVisitNotes(selectedVisit.notes)
    const completedAt = new Date()
    const completedAtIso = completedAt.toISOString()
    const key = RESULT_KEYS[department]
    const current = (parsed[key] as ResultEntry[]) || []
    const payload = getMockPayload(department)
    current.push({
      at: selectedOrderAt,
      testType: selectedTestType,
      result: payload.result,
      completedAt: completedAtIso,
      attachmentPath: payload.attachmentPath,
    })

    const erOrders = (parsed.erOrders as Array<{ at?: string; type?: string; status?: string; content?: string }>) || []
    const selectedAtStr = String(selectedOrderAt)
    // Sonar is handled above; here department is only Radiology | Lab.
    const isImaging = department === 'Radiology'
    const updatedErOrders = isImaging
      ? erOrders
      : erOrders.map((o) => (String(o.at) === selectedAtStr ? { ...o, status: 'COMPLETED' as const } : o))
    const lastResultAt = (parsed.lastResultAt as Record<string, string>) || {}
    if (!isImaging) {
      lastResultAt[department] = completedAtIso
    }
    parsed.lastResultAt = lastResultAt

    const wasOutForTest = selectedVisit.status === VisitStatus.OUT_FOR_TEST
    await prisma.visit.update({
      where: { id: selectedVisit.id },
      data: {
        notes: JSON.stringify({
          ...parsed,
          erOrders: updatedErOrders,
          lastResultAt,
          [key]: current,
        }),
        ...(!isImaging && wasOutForTest && { status: VisitStatus.COMPLETED }),
        updatedAt: new Date(),
      },
    })

    const patientName = selectedVisit.patient
      ? `${selectedVisit.patient.firstName} ${selectedVisit.patient.lastName}`.trim()
      : 'Patient'
    return NextResponse.json({
      success: true,
      patientName,
      visitId: selectedVisit.id,
      department,
      message: 'Data sent from Device to ZION Server successfully!',
    })
  } catch (e: unknown) {
    const err = e as Error
    return NextResponse.json({ error: err?.message || 'Simulation failed' }, { status: 500 })
  }
}
