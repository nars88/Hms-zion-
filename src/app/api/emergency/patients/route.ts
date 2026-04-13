import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import { orderHasReleasedImagingResult } from '@/lib/imagingRelease'

export const dynamic = 'force-dynamic'

// GET /api/emergency/patients
// Returns all ER patients (chiefComplaint contains Emergency/ER), any status except Discharged
export async function GET() {
  try {
    const visits = await prisma.visit.findMany({
      where: {
        status: { not: VisitStatus.Discharged },
        OR: [
          { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' } },
          { chiefComplaint: { contains: 'ER', mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        patientId: true,
        chiefComplaint: true,
        status: true,
        notes: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true,
            gender: true,
            phone: true,
            triageLevel: true,
          },
        },
        bill: { select: { paymentStatus: true } },
        vitals: { orderBy: { recordedAt: 'desc' }, take: 1 },
        medicationOrders: { select: { status: true } },
      },
    })

    const list = visits
      .map((v) => {
        try {
          const p = v.patient
      const age = p?.dateOfBirth
        ? Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : null
      const latestVitals = v.vitals[0]
      const patientId = p?.id ?? v.patientId
      const name = p ? `${p.firstName} ${p.lastName}`.trim() : 'Patient info missing'
      let erOrders: Array<{ type: string; content?: string; at: string; status?: string }> = []
      let doctorMedications = ''
      let doctorLabTests = ''
      let labReady = false
      let radiologyReady = false
      let sonarReady = false
      let hasLabRequest = false
      let hasRadiologyRequest = false
      let hasSonarRequest = false
      let hasPendingDiagnostics = false
      let labDiagnostic: { summary: string; attachmentPath?: string } | null = null
      let radiologyDiagnostic: { summary: string; attachmentPath?: string; technicianNotes?: string } | null = null
      let sonarDiagnostic: { summary: string; attachmentPath?: string; technicianNotes?: string } | null = null
      let labUnreviewed = false
      let radiologyUnreviewed = false
      let sonarUnreviewed = false
      try {
        const notesJson = (v as { notes?: string | null }).notes
        if (notesJson && typeof notesJson === 'string') {
          const parsed = JSON.parse(notesJson) as {
            erOrders?: typeof erOrders
            doctorMedications?: string
            doctorLabTests?: string
            labResults?: Array<{ at?: string; testType?: string; result?: string; attachmentPath?: string }>
            radiologyResults?: Array<{
              at?: string
              testType?: string
              result?: string
              attachmentPath?: string
              releasedToDoctorAt?: string
              technicianNotes?: string
            }>
            sonarResults?: Array<{
              at?: string
              testType?: string
              result?: string
              attachmentPath?: string
              releasedToDoctorAt?: string
              technicianNotes?: string
            }>
            lastResultAt?: { Lab?: string; Radiology?: string; Sonar?: string }
            lastReviewedAt?: { Lab?: string; Radiology?: string; Sonar?: string }
          }
          if (parsed.erOrders) erOrders = parsed.erOrders
          if (parsed.doctorMedications) doctorMedications = parsed.doctorMedications
          if (parsed.doctorLabTests) doctorLabTests = parsed.doctorLabTests
          const labOrders = (parsed.erOrders || []).filter((o: { type: string }) => o.type === 'LAB' || o.type === 'LAB_REQUESTED')
          const radiologyOrders = (parsed.erOrders || []).filter((o: { type: string }) => o.type === 'RADIOLOGY_REQUESTED')
          const sonarOrders = (parsed.erOrders || []).filter((o: { type: string }) => o.type === 'SONAR_REQUESTED')
          const labResults = parsed.labResults || []
          const radiologyResults = parsed.radiologyResults || []
          const sonarResults = parsed.sonarResults || []
          if (labOrders.length > 0) {
            labReady = labOrders.every((o: { at: string }) => labResults.some((r: { at?: string }) => r.at === o.at))
            hasLabRequest = !labReady
            const last = labResults[labResults.length - 1]
            if (last) labDiagnostic = { summary: last.result || '', attachmentPath: last.attachmentPath }
          }
          if (radiologyOrders.length > 0) {
            radiologyReady = radiologyOrders.every((o: { at: string }) =>
              orderHasReleasedImagingResult(radiologyResults, o.at)
            )
            hasRadiologyRequest = !radiologyReady
            const released = radiologyResults.filter((r) => r.releasedToDoctorAt)
            const last =
              released.length > 0
                ? released.reduce((a, b) => ((a.releasedToDoctorAt || '') > (b.releasedToDoctorAt || '') ? a : b))
                : null
            if (last) {
              radiologyDiagnostic = {
                summary: last.result || '',
                attachmentPath: last.attachmentPath,
                technicianNotes: last.technicianNotes,
              }
            }
          }
          if (sonarOrders.length > 0) {
            sonarReady = sonarOrders.every((o: { at: string }) =>
              orderHasReleasedImagingResult(sonarResults, o.at)
            )
            hasSonarRequest = !sonarReady
            const released = sonarResults.filter((r) => r.releasedToDoctorAt)
            const last =
              released.length > 0
                ? released.reduce((a, b) => ((a.releasedToDoctorAt || '') > (b.releasedToDoctorAt || '') ? a : b))
                : null
            if (last) {
              sonarDiagnostic = {
                summary: last.result || '',
                attachmentPath: last.attachmentPath,
                technicianNotes: last.technicianNotes,
              }
            }
          }
          hasPendingDiagnostics =
            (labOrders.length > 0 && !labReady) ||
            (radiologyOrders.length > 0 && !radiologyReady) ||
            (sonarOrders.length > 0 && !sonarReady)
          // ER result alerts: unreviewed = has result and (never reviewed or new result after last review)
          const lastResultAt = parsed.lastResultAt || {}
          const lastReviewedAt = parsed.lastReviewedAt || {}
          if (labReady && lastResultAt.Lab) {
            labUnreviewed = !lastReviewedAt.Lab || lastResultAt.Lab > lastReviewedAt.Lab
          }
          if (radiologyReady && lastResultAt.Radiology) {
            radiologyUnreviewed = !lastReviewedAt.Radiology || lastResultAt.Radiology > lastReviewedAt.Radiology
          }
          if (sonarReady && lastResultAt.Sonar) {
            sonarUnreviewed = !lastReviewedAt.Sonar || lastResultAt.Sonar > lastReviewedAt.Sonar
          }
        }
      } catch (_) {}
      const medOrderStatus = v.medicationOrders?.status ?? null
      return {
        visitId: v.id,
        patientId,
        name: name || 'Patient info missing',
        age,
        gender: p?.gender ?? '',
        chiefComplaint: v.chiefComplaint ?? '',
        status: v.status,
        triageLevel: p?.triageLevel ?? null,
        bedNumber: 'bedNumber' in v ? (v as { bedNumber?: number | null }).bedNumber ?? null : null,
        labReady,
        radiologyReady,
        sonarReady,
        hasLabRequest,
        hasRadiologyRequest,
        hasSonarRequest,
        hasPendingDiagnostics,
        billingStatus:
          (v as { status?: string }).status === 'Billing' && (v as { bill?: { paymentStatus: string } | null }).bill
            ? (v as { bill: { paymentStatus: string } }).bill.paymentStatus === 'Paid'
              ? 'paid'
              : 'waiting_for_payment'
            : null,
        labDiagnostic,
        radiologyDiagnostic,
        sonarDiagnostic,
        labUnreviewed,
        radiologyUnreviewed,
        sonarUnreviewed,
        pharmacyOrderStatus: medOrderStatus,
        medicineReady: medOrderStatus === 'DISPENSED',
        pharmacyOutOfStock: medOrderStatus === 'OUT_OF_STOCK',
        doctorMedications,
        doctorLabTests,
        erOrders,
        vitals: latestVitals
          ? {
              bp: latestVitals.bp,
              temperature: latestVitals.temperature,
              heartRate: latestVitals.heartRate,
              weight: latestVitals.weight,
            }
          : null,
      }
    } catch (_) {
      return null
    }
  })
      .filter((x): x is NonNullable<typeof x> => x != null)

    return NextResponse.json(list)
  } catch (e) {
    console.error('Error fetching emergency patients:', e)
    // Return 200 with empty list so dashboard still loads (active visitId logic is handled above)
    return NextResponse.json([])
  }
}
