import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'
const ER_BEDS_CACHE_TTL_MS = 3000
const erBedsCache = new Map<string, { at: number; data: unknown[] }>()

const TOTAL_BEDS = 12

type DiagnosticDepartment = 'Lab' | 'Radiology' | 'Sonar' | 'ECG'

interface LabRequest {
  at: string
  testType: string
  status: 'PENDING' | 'IN_PROGRESS' | 'SAMPLE_COLLECTED' | 'COMPLETED'
  result?: string
  completedAt?: string
  attachmentPath?: string
  technicianNotes?: string
  releasedToDoctorAt?: string
}

const DEPARTMENT_ORDER_TYPES: Record<DiagnosticDepartment, string[]> = {
  Lab: ['LAB', 'LAB_REQUESTED'],
  Radiology: ['RADIOLOGY_REQUESTED', 'RADIOLOGY', 'XRAY', 'X_RAY'],
  Sonar: ['SONAR_REQUESTED', 'SONAR', 'ULTRASOUND'],
  ECG: ['ECG_REQUESTED', 'ECG'],
}
const DEPARTMENT_RESULTS_KEY: Record<DiagnosticDepartment, string> = {
  Lab: 'labResults',
  Radiology: 'radiologyResults',
  Sonar: 'sonarResults',
  ECG: 'ecgResults',
}

// GET /api/lab/er-beds?department=Lab|Radiology|Sonar - ER beds with request status for that department
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const department = (searchParams.get('department') || 'Lab') as DiagnosticDepartment
    const cacheKey = `dept:${department}`
    const cached = erBedsCache.get(cacheKey)
    if (cached && Date.now() - cached.at < ER_BEDS_CACHE_TTL_MS) {
      return NextResponse.json(cached.data)
    }
    const orderTypes = DEPARTMENT_ORDER_TYPES[department] ?? DEPARTMENT_ORDER_TYPES.Lab
    const resultsKey = DEPARTMENT_RESULTS_KEY[department] ?? 'labResults'
    const visits = await prisma.visit.findMany({
      where: {
        status: { not: VisitStatus.Discharged },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        patientId: true,
        notes: true,
        status: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            triageLevel: true,
            dateOfBirth: true,
          },
        },
      },
    })

    const bedMap = new Map<
      number,
      {
        bedNumber: number
        visitId: string
        patientId: string
        patientName: string
        patientAge: number | null
        triageLevel: number | null
        visitStatus: string
        labRequests: LabRequest[]
      }
    >()

    // Some dev DBs may be out of sync (missing `bedNumber` column).
    // If bedNumber is absent, we assign sequential bed slots for UI rendering.
    let nextBedNumber = 1

    for (const v of visits) {
      const patientName = `${v.patient?.firstName ?? ''} ${v.patient?.lastName ?? ''}`.trim()
      const labRequests: LabRequest[] = []
      let resultsList: Array<{
        at?: string
        testType?: string
        result: string
        completedAt?: string
        attachmentPath?: string
        releasedToDoctorAt?: string
        technicianNotes?: string
      }> = []
      try {
        if (v.notes) {
          const parsed = JSON.parse(v.notes) as Record<string, unknown>
          const erOrders = (parsed.erOrders as Array<{ type: string; content?: string; at: string; status?: string }>) || []
          resultsList = (parsed[resultsKey] as typeof resultsList) || []
          for (const order of erOrders) {
            if (!orderTypes.includes(order.type)) continue
            const contentLower = (order.content || '').toLowerCase()
            const looksRadiology = /\b(x-?ray|ct\b|mri|ultrasound|radiology)\b/.test(contentLower)
            const looksLab = /\b(cbc|glucose|creatinine|hb|wbc|rbc|blood\s*type|lab\b)\b/.test(contentLower)
            if (department === 'Lab' && looksRadiology) continue
            if (department === 'Radiology' && looksLab) continue
            if (department === 'ECG' && looksLab) continue
            const testType =
              order.content ||
              (department === 'Lab'
                ? 'Lab'
                : department === 'Radiology'
                  ? 'X-Ray'
                  : department === 'ECG'
                    ? 'ECG'
                    : 'Sonar')
            const byOrderAt = resultsList.find((r) => String(r.at) === String(order.at))
            const fuzzyMatch = resultsList.find(
              (r) =>
                r.testType &&
                testType &&
                (r.testType.includes(testType) || testType.includes(r.testType))
            )
            const resultRow = byOrderAt ?? fuzzyMatch
            const orderMarkedDone = String(order.status || '').toUpperCase() === 'COMPLETED'
            const isImagingDept = department === 'Radiology' || department === 'Sonar' || department === 'ECG'
            const done = isImagingDept ? orderMarkedDone : Boolean(resultRow) || orderMarkedDone
            const rawStatus = String(order.status || '').toUpperCase()
            const normalizedActiveStatus: LabRequest['status'] =
              rawStatus === 'IN_PROGRESS'
                ? 'IN_PROGRESS'
                : rawStatus === 'SAMPLE_COLLECTED'
                  ? 'SAMPLE_COLLECTED'
                  : 'PENDING'
            const displayRow =
              resultRow ?? (orderMarkedDone ? resultsList.find((r) => String(r.at) === String(order.at)) : undefined)
            const rawPath = displayRow?.attachmentPath
            const attachmentPath =
              typeof rawPath === 'string' && rawPath.trim() ? rawPath.trim() : undefined
            labRequests.push({
              at: order.at,
              testType,
              status: done ? 'COMPLETED' : normalizedActiveStatus,
              result: displayRow?.result,
              completedAt: displayRow?.completedAt,
              attachmentPath,
              technicianNotes:
                typeof displayRow?.technicianNotes === 'string' ? displayRow.technicianNotes : undefined,
              releasedToDoctorAt:
                typeof displayRow?.releasedToDoctorAt === 'string' ? displayRow.releasedToDoctorAt : undefined,
            })
          }
        }
      } catch (_) {}
      if (labRequests.length === 0) continue
      let bedNum = (v as { bedNumber?: number | null }).bedNumber
      if (bedNum == null) {
        if (nextBedNumber > TOTAL_BEDS) continue
        bedNum = nextBedNumber++
      }
      const triageLevel = v.patient?.triageLevel ?? null
      const patientAge =
        v.patient?.dateOfBirth instanceof Date
          ? Math.max(0, new Date().getFullYear() - v.patient.dateOfBirth.getFullYear())
          : null
      const visitStatus = (v as { status?: string }).status ?? ''
      bedMap.set(bedNum, {
        bedNumber: bedNum,
        visitId: v.id,
        patientId: v.patientId,
        patientName: patientName || 'Patient info missing',
        patientAge,
        triageLevel,
        visitStatus,
        labRequests,
      })
    }

    const beds: Array<{
      bedNumber: number
      visitId: string | null
      patientId: string | null
      patientName: string | null
      patientAge?: number | null
      triageLevel?: number | null
      visitStatus?: string
      labRequests: LabRequest[]
    }> = []
    for (let n = 1; n <= TOTAL_BEDS; n++) {
      const row = bedMap.get(n)
      if (row) {
        beds.push(row)
      } else {
        beds.push({
          bedNumber: n,
          visitId: null,
          patientId: null,
          patientName: null,
          patientAge: null,
          triageLevel: null,
          visitStatus: '',
          labRequests: [],
        })
      }
    }

    erBedsCache.set(cacheKey, { at: Date.now(), data: beds })
    return NextResponse.json(beds)
  } catch (e) {
    console.error('Error fetching ER lab beds:', e)
    // Lab/Radiology/Sonar dashboards: return empty bed list instead of 500
    return NextResponse.json([])
  }
}
