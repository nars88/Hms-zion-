import { NextResponse } from 'next/server'
import { Prisma, VisitStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { forbidden, getRequestUser, unauthorized } from '@/lib/apiAuth'
import { forbiddenClinicalAccess, isClinicalAccessAllowed } from '@/lib/rbacClinical'

export const dynamic = 'force-dynamic'

type ImagingRow = {
  result?: string
  attachmentPath?: string
  releasedToDoctorAt?: string
  technicianNotes?: string
}

type ParsedNotes = {
  labResults?: Array<{ result?: string }>
  radiologyResults?: ImagingRow[]
  sonarResults?: ImagingRow[]
  ecgResults?: ImagingRow[]
  finalDisposition?: string
  archiveState?: string
}

type PatientBasic = {
  id: string
  firstName: string
  lastName: string
}

type PatientWithSonar = PatientBasic & {
  sonarImage: string | null
  sonarNotes: string | null
  sonarStatus: string | null
}

type VisitRow = {
  id: string
  status: VisitStatus
  notes: string | null
  chiefComplaint: string | null
  visitDate: Date
  patient: PatientBasic | PatientWithSonar | null
}

type CaseListRow = {
  visitId: string
  patientId: string
  status: VisitStatus
  patientName: string
  chiefComplaint: string
  visitDate: string
  badges: { xray: boolean; sonar: boolean; lab: boolean; ecg: boolean }
}

function latestReleased(rows: ImagingRow[] | undefined): ImagingRow | undefined {
  const rel = (rows || []).filter((r) => r.releasedToDoctorAt)
  if (!rel.length) return undefined
  return rel.reduce((a, b) =>
    (a.releasedToDoctorAt || '') > (b.releasedToDoctorAt || '') ? a : b
  )
}

function hasPatientSonarFields(p: PatientBasic | PatientWithSonar | null): p is PatientWithSonar {
  return p != null && 'sonarImage' in p
}

function shouldRetryWithoutPatientSonar(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2022') {
    return true
  }
  const m = e instanceof Error ? e.message : String(e)
  return (
    (m.includes('Unknown field') && m.includes('sonar')) ||
    m.includes('sonarImage') ||
    m.includes('sonarNotes') ||
    m.includes('sonarStatus') ||
    (m.toLowerCase().includes('column') && m.toLowerCase().includes('does not exist'))
  )
}

function parseVisitNotes(notes: string | null): ParsedNotes {
  try {
    return notes ? (JSON.parse(notes) as ParsedNotes) : {}
  } catch {
    return {}
  }
}

function mapVisitToListRow(v: VisitRow, includeEmpty: boolean): CaseListRow | null {
  const parsed = parseVisitNotes(v.notes)
  const archived = parsed.finalDisposition === 'ARCHIVED' || parsed.archiveState === 'ARCHIVED'
  if (archived) return null

  const lastLab = parsed.labResults?.[parsed.labResults.length - 1]
  const lastXray = latestReleased(parsed.radiologyResults)
  const lastSonar = latestReleased(parsed.sonarResults)
  const lastEcg = latestReleased(parsed.ecgResults)

  const p = v.patient
  const patientSonarImg = hasPatientSonarFields(p) ? (p.sonarImage || '').trim() : ''
  const patientSonarStatus = hasPatientSonarFields(p) ? String(p.sonarStatus || '') : ''
  const hasPatientSonarRecord =
    hasPatientSonarFields(p) &&
    (Boolean(patientSonarImg) || patientSonarStatus.toUpperCase() === 'COMPLETE')

  const hasAny = !!(lastLab || lastXray || lastSonar || lastEcg || hasPatientSonarRecord)
  if (!hasAny && !includeEmpty) return null

  return {
    visitId: v.id,
    patientId: v.patient?.id ?? '',
    status: v.status,
    patientName: `${v.patient?.firstName || ''} ${v.patient?.lastName || ''}`.trim() || 'Unknown',
    chiefComplaint: v.chiefComplaint?.trim() || '',
    visitDate: v.visitDate.toISOString(),
    badges: {
      xray: !!lastXray,
      sonar: !!lastSonar || hasPatientSonarRecord,
      lab: !!lastLab,
      ecg: !!lastEcg,
    },
  }
}

function mapVisitToDetailRow(v: VisitRow, includeEmpty: boolean) {
  const base = mapVisitToListRow(v, includeEmpty)
  if (!base) return null
  const parsed = parseVisitNotes(v.notes)
  const lastLab = parsed.labResults?.[parsed.labResults.length - 1]
  const lastXray = latestReleased(parsed.radiologyResults)
  const lastSonar = latestReleased(parsed.sonarResults)
  const lastEcg = latestReleased(parsed.ecgResults)
  const p = v.patient

  const patientSonarImg = hasPatientSonarFields(p) ? (p.sonarImage || '').trim() : ''
  const hasPatientSonarRecord =
    hasPatientSonarFields(p) &&
    (Boolean(patientSonarImg) || String(p.sonarStatus || '').toUpperCase() === 'COMPLETE')

  const sonarFromVisit = lastSonar
    ? {
        summary: lastSonar.result || '',
        image: (lastSonar.attachmentPath || '').trim(),
        technicianNotes: lastSonar.technicianNotes,
      }
    : null
  const sonarFromPatient =
    !sonarFromVisit && hasPatientSonarRecord && hasPatientSonarFields(p)
      ? {
          summary: patientSonarImg ? 'Ultrasound / Sonar study' : 'Ultrasound / Sonar',
          image: patientSonarImg,
          technicianNotes: p.sonarNotes?.trim() ? p.sonarNotes : undefined,
        }
      : null
  const sonarBlock = sonarFromVisit || sonarFromPatient

  return {
    ...base,
    xray: lastXray
      ? {
          summary: lastXray.result || '',
          image: lastXray.attachmentPath || '',
          technicianNotes: lastXray.technicianNotes,
        }
      : null,
    sonar: sonarBlock,
    ecg: lastEcg
      ? {
          image: (lastEcg.attachmentPath || '').trim(),
          summary: lastEcg.result || '',
          technicianNotes: lastEcg.technicianNotes,
        }
      : null,
    labSummary: lastLab?.result || '',
  }
}

/** Clinic doctor views: exclude ER / emergency visits (same as /api/doctor/queue). */
const excludeErChiefComplaint: Prisma.VisitWhereInput = {
  NOT: {
    OR: [
      { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' } },
      { chiefComplaint: { contains: 'ER', mode: 'insensitive' } },
      { chiefComplaint: { contains: 'emergency', mode: 'insensitive' } },
    ],
  },
}

function buildWhere(key: string | null): Prisma.VisitWhereInput {
  if (!key?.trim()) {
    return {
      status: { not: VisitStatus.Discharged },
      ...excludeErChiefComplaint,
    }
  }
  const cleaned = key.trim()
  return {
    AND: [
      { status: { not: VisitStatus.Discharged } },
      excludeErChiefComplaint,
      { OR: [{ id: cleaned }, { patientId: cleaned }] },
    ],
  }
}

const visitOrderBy = { updatedAt: 'desc' as const }

const baseVisitSelect = {
  id: true,
  status: true,
  notes: true,
  chiefComplaint: true,
  visitDate: true,
} as const

export async function GET(request: Request) {
  try {
    const user = await getRequestUser(request)
    if (!user) return unauthorized()
    if (!['DOCTOR', 'ADMIN'].includes(user.role)) return forbidden()
    if (!isClinicalAccessAllowed(user.role)) {
      return forbiddenClinicalAccess(user, request)
    }

    const url = new URL(request.url)
    const key = url.searchParams.get('key')
    const mode = url.searchParams.get('mode') || 'list'
    const offset = Math.max(0, Number(url.searchParams.get('offset') || 0))
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 12)))
    const includeEmpty = Boolean(key?.trim())
    let visits: VisitRow[]

    try {
      visits = (await prisma.visit.findMany({
        where: buildWhere(key),
        orderBy: visitOrderBy,
        skip: mode === 'list' ? offset : 0,
        take: mode === 'list' ? limit : 1,
        select: {
          ...baseVisitSelect,
          patient: {
            select: {
              firstName: true,
              lastName: true,
              id: true,
              sonarImage: true,
              sonarNotes: true,
              sonarStatus: true,
            },
          },
        },
      })) as unknown as VisitRow[]
    } catch (e) {
      if (!shouldRetryWithoutPatientSonar(e)) throw e
      visits = (await prisma.visit.findMany({
        where: buildWhere(key),
        orderBy: visitOrderBy,
        skip: mode === 'list' ? offset : 0,
        take: mode === 'list' ? limit : 1,
        select: {
          ...baseVisitSelect,
          patient: {
            select: {
              firstName: true,
              lastName: true,
              id: true,
            },
          },
        },
      })) as unknown as VisitRow[]
    }

    if (mode === 'detail') {
      const row = visits.length ? mapVisitToDetailRow(visits[0], true) : null
      return NextResponse.json({ row })
    }

    const rows = visits
      .map((v) => mapVisitToListRow(v, includeEmpty))
      .filter(Boolean) as CaseListRow[]
    const hasMore = rows.length >= limit
    return NextResponse.json({ rows, hasMore, nextOffset: offset + rows.length })
  } catch (e: unknown) {
    const err = e as Error
    return NextResponse.json({ error: err?.message || 'Failed to load completed cases' }, { status: 500 })
  }
}
