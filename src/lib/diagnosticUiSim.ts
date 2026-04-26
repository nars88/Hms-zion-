/**
 * Ephemeral client-only diagnostic UI simulation (Lab / Radiology / ER Doctor).
 * Enabled in-memory for the current browser tab; full reload clears everything.
 * Never touches the database.
 */

import type { ERPatient, ResultCardType } from '@/types/er'
import { DEMO_RADIOLOGY_XRAY_IMAGE_URL, DEMO_SONAR_ULTRASOUND_IMAGE_URL } from '@/config/demoDiagnosticImageUrls'

export const DIAGNOSTIC_UI_SIM_PREFIX = 'zion-ui-sim-'

/** 1×1 transparent PNG — opens in a new tab like an uploaded image/PDF preview. */
export const DIAGNOSTIC_UI_SIM_TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

let simEnabled = false
const dismissed = new Set<string>()

function dismissKey(visitId: string, type: ResultCardType) {
  return `${visitId}:${type}`
}

export function isDiagnosticUiSimEnabled(): boolean {
  return simEnabled
}

export function isSimVisitId(visitId: string | null | undefined): boolean {
  return Boolean(visitId && visitId.startsWith(DIAGNOSTIC_UI_SIM_PREFIX))
}

/** Call once (e.g. from ?mockDiagnostics=1 or a toolbar button). Clears prior dismissals for a fresh run. */
export function enableDiagnosticUiSim() {
  simEnabled = true
  dismissed.clear()
}

export function dismissSimDoctorAlerts(visitId: string, type: ResultCardType) {
  if (!isSimVisitId(visitId)) return
  dismissed.add(dismissKey(visitId, type))
}

export function readSimulationFlagFromUrl(): void {
  if (typeof window === 'undefined') return
  const v = new URLSearchParams(window.location.search).get('mockDiagnostics')
  if (v === '1' || v === 'true') enableDiagnosticUiSim()
}

/** Lab /api/lab/er-beds-style bed rows (merged client-side only). */
export function getDiagnosticSimLabBedRows(): Array<{
  visitId: string | null
  patientId: string | null
  patientName: string | null
  labRequests: Array<{
    at: string
    testType: string
    status: 'PENDING' | 'IN_PROGRESS' | 'SAMPLE_COLLECTED' | 'COMPLETED'
    result?: string
    completedAt?: string
    releasedToDoctorAt?: string
    attachmentPath?: string
  }>
}> {
  const t1 = new Date(Date.now() - 50 * 60_000).toISOString()
  const t2 = new Date(Date.now() - 40 * 60_000).toISOString()
  const t3 = new Date(Date.now() - 30 * 60_000).toISOString()
  const t4 = new Date(Date.now() - 20 * 60_000).toISOString()
  const t5 = new Date(Date.now() - 10 * 60_000).toISOString()

  return [
    {
      visitId: `${DIAGNOSTIC_UI_SIM_PREFIX}v1`,
      patientId: `${DIAGNOSTIC_UI_SIM_PREFIX}p1`,
      patientName: 'Nour Ali (SIM)',
      labRequests: [{ at: t1, testType: 'CBC + Diff', status: 'PENDING' }],
    },
    {
      visitId: `${DIAGNOSTIC_UI_SIM_PREFIX}v2`,
      patientId: `${DIAGNOSTIC_UI_SIM_PREFIX}p2`,
      patientName: 'Omar Hassan (SIM)',
      labRequests: [{ at: t2, testType: 'Lipid Panel', status: 'IN_PROGRESS' }],
    },
    {
      visitId: `${DIAGNOSTIC_UI_SIM_PREFIX}v3`,
      patientId: `${DIAGNOSTIC_UI_SIM_PREFIX}p3`,
      patientName: 'Layla Said (SIM)',
      labRequests: [
        {
          at: t3,
          testType: 'BMP',
          status: 'COMPLETED',
          result: 'Na 140, K 4.2, Cr 0.9 (SIM) — see attachment',
          completedAt: t3,
          attachmentPath: DIAGNOSTIC_UI_SIM_TINY_PNG,
        },
      ],
    },
    {
      visitId: `${DIAGNOSTIC_UI_SIM_PREFIX}v4`,
      patientId: `${DIAGNOSTIC_UI_SIM_PREFIX}p4`,
      patientName: 'Karim Fadel (SIM)',
      labRequests: [
        {
          at: t4,
          testType: 'HbA1c',
          status: 'COMPLETED',
          result: '5.6% (SIM)',
          completedAt: t4,
        },
      ],
    },
    {
      visitId: `${DIAGNOSTIC_UI_SIM_PREFIX}v5`,
      patientId: `${DIAGNOSTIC_UI_SIM_PREFIX}p5`,
      patientName: 'Sara Noor (SIM)',
      labRequests: [
        {
          at: t5,
          testType: 'TSH',
          status: 'COMPLETED',
          result: '2.1 mIU/L (SIM)',
          completedAt: t5,
          releasedToDoctorAt: new Date(Date.now() - 5 * 60_000).toISOString(),
        },
      ],
    },
  ]
}

/** Radiology-only bed rows (X-Ray tab). */
export function getDiagnosticSimRadiologyBedRows(): Array<{
  visitId: string | null
  patientId: string | null
  patientName: string | null
  labRequests: Array<{
    at: string
    testType: string
    status: 'Pending' | 'Completed'
    result?: string
    completedAt?: string
    attachmentPath?: string
    technicianNotes?: string
    releasedToDoctorAt?: string
  }>
}> {
  const t1 = new Date(Date.now() - 48 * 60_000).toISOString()
  const t2 = new Date(Date.now() - 44 * 60_000).toISOString()
  const t3 = new Date(Date.now() - 35 * 60_000).toISOString()
  const t4 = new Date(Date.now() - 25 * 60_000).toISOString()
  const t5 = new Date(Date.now() - 15 * 60_000).toISOString()

  return [
    {
      visitId: `${DIAGNOSTIC_UI_SIM_PREFIX}rx1`,
      patientId: `${DIAGNOSTIC_UI_SIM_PREFIX}rp1`,
      patientName: 'Nour Ali (SIM)',
      labRequests: [{ at: t1, testType: 'Chest PA', status: 'Pending' }],
    },
    {
      visitId: `${DIAGNOSTIC_UI_SIM_PREFIX}rx2`,
      patientId: `${DIAGNOSTIC_UI_SIM_PREFIX}rp2`,
      patientName: 'Omar Hassan (SIM)',
      labRequests: [{ at: t2, testType: 'CT Abdomen', status: 'Pending' }],
    },
    {
      visitId: `${DIAGNOSTIC_UI_SIM_PREFIX}rx3`,
      patientId: `${DIAGNOSTIC_UI_SIM_PREFIX}rp3`,
      patientName: 'Layla Said (SIM)',
      labRequests: [
        {
          at: t3,
          testType: 'Chest PA (review)',
          status: 'Completed',
          result: 'Technician draft (SIM)',
          completedAt: t3,
          attachmentPath: DEMO_RADIOLOGY_XRAY_IMAGE_URL,
        },
      ],
    },
    {
      visitId: `${DIAGNOSTIC_UI_SIM_PREFIX}rx4`,
      patientId: `${DIAGNOSTIC_UI_SIM_PREFIX}rp4`,
      patientName: 'Karim Fadel (SIM)',
      labRequests: [
        {
          at: t4,
          testType: 'Chest PA',
          status: 'Completed',
          result: 'No acute cardiopulmonary process (SIM).',
          completedAt: t4,
          attachmentPath: DEMO_RADIOLOGY_XRAY_IMAGE_URL,
          technicianNotes: 'SIM — awaiting send to doctor',
        },
      ],
    },
    {
      visitId: `${DIAGNOSTIC_UI_SIM_PREFIX}rx5`,
      patientId: `${DIAGNOSTIC_UI_SIM_PREFIX}rp5`,
      patientName: 'Sara Noor (SIM)',
      labRequests: [
        {
          at: t5,
          testType: 'Portable CXR',
          status: 'Completed',
          result: 'Lines/tubes positioned (SIM).',
          completedAt: t5,
          attachmentPath: DEMO_RADIOLOGY_XRAY_IMAGE_URL,
          technicianNotes: 'SIM — unread for doctor',
          releasedToDoctorAt: new Date(Date.now() - 3 * 60_000).toISOString(),
        },
      ],
    },
  ]
}

function applyDismiss(p: ERPatient): ERPatient {
  if (!isSimVisitId(p.visitId)) return p
  let next: ERPatient = { ...p }
  if (dismissed.has(dismissKey(p.visitId, 'Lab'))) {
    next = { ...next, labUnreviewed: false }
  }
  if (dismissed.has(dismissKey(p.visitId, 'Radiology'))) {
    next = { ...next, radiologyUnreviewed: false }
  }
  if (dismissed.has(dismissKey(p.visitId, 'Sonar'))) {
    next = { ...next, sonarUnreviewed: false }
  }
  if (dismissed.has(dismissKey(p.visitId, 'ECG'))) {
    next = { ...next, ecgUnreviewed: false }
  }
  return next
}

/** ER Doctor board: 5 mock beds with mixed pending + completed + green unread markers. */
export function getDiagnosticSimErPatients(): ERPatient[] {
  const baseVitals = {
    bp: '118/76',
    temperature: 36.9,
    heartRate: 82,
    weight: 72,
    spo2: 98 as number | null,
    recordingSource: null as string | null,
  }

  const p1: ERPatient = {
    visitId: `${DIAGNOSTIC_UI_SIM_PREFIX}er1`,
    patientId: `${DIAGNOSTIC_UI_SIM_PREFIX}ep1`,
    name: 'Nour Ali (SIM)',
    age: 34,
    gender: 'F',
    chiefComplaint: 'Emergency · UI simulation',
    status: 'In_Consultation',
    triageLevel: 3,
    bedNumber: 1,
    vitals: baseVitals,
    labReady: false,
    hasLabRequest: true,
    labUnreviewed: false,
    labDiagnostic: null,
    radiologyReady: false,
    hasRadiologyRequest: true,
    radiologyUnreviewed: false,
    radiologyDiagnostic: null,
    sonarReady: false,
    hasSonarRequest: false,
    sonarUnreviewed: false,
    sonarDiagnostic: null,
    ecgReady: false,
    hasEcgRequest: false,
    ecgUnreviewed: false,
    ecgDiagnostic: null,
    hasPendingDiagnostics: true,
  }

  const p2: ERPatient = {
    ...p1,
    visitId: `${DIAGNOSTIC_UI_SIM_PREFIX}er2`,
    patientId: `${DIAGNOSTIC_UI_SIM_PREFIX}ep2`,
    name: 'Omar Hassan (SIM)',
    bedNumber: 2,
    triageLevel: 2,
    labReady: false,
    hasLabRequest: true,
    hasPendingDiagnostics: true,
  }

  const p3: ERPatient = {
    ...p1,
    visitId: `${DIAGNOSTIC_UI_SIM_PREFIX}er3`,
    patientId: `${DIAGNOSTIC_UI_SIM_PREFIX}ep3`,
    name: 'Layla Said (SIM)',
    bedNumber: 3,
    triageLevel: 3,
    labReady: true,
    hasLabRequest: false,
    labUnreviewed: true,
    labDiagnostic: {
      summary: 'CBC (SIM): WBC 7.2, Hgb 13.1, Plt 245',
      attachmentPath: DIAGNOSTIC_UI_SIM_TINY_PNG,
    },
    hasPendingDiagnostics: false,
  }

  const p4: ERPatient = {
    ...p1,
    visitId: `${DIAGNOSTIC_UI_SIM_PREFIX}er4`,
    patientId: `${DIAGNOSTIC_UI_SIM_PREFIX}ep4`,
    name: 'Karim Fadel (SIM)',
    bedNumber: 4,
    triageLevel: 3,
    radiologyReady: true,
    hasRadiologyRequest: false,
    radiologyUnreviewed: true,
    radiologyDiagnostic: {
      summary: 'Chest PA (SIM): no acute infiltrate.',
      attachmentPath: DEMO_RADIOLOGY_XRAY_IMAGE_URL,
      technicianNotes: 'SIM technician sign-off',
    },
    labReady: false,
    hasLabRequest: false,
    hasPendingDiagnostics: false,
  }

  const p5: ERPatient = {
    ...p1,
    visitId: `${DIAGNOSTIC_UI_SIM_PREFIX}er5`,
    patientId: `${DIAGNOSTIC_UI_SIM_PREFIX}ep5`,
    name: 'Sara Noor (SIM)',
    bedNumber: 5,
    triageLevel: 2,
    labReady: true,
    hasLabRequest: false,
    labUnreviewed: true,
    labDiagnostic: {
      summary: 'BMP (SIM): within normal limits.',
      attachmentPath: DIAGNOSTIC_UI_SIM_TINY_PNG,
    },
    radiologyReady: true,
    hasRadiologyRequest: false,
    radiologyUnreviewed: true,
    radiologyDiagnostic: {
      summary: 'Pelvic US (SIM): no free fluid.',
      attachmentPath: DEMO_SONAR_ULTRASOUND_IMAGE_URL,
      technicianNotes: 'SIM — dual unread',
    },
    hasPendingDiagnostics: false,
  }

  return [p1, p2, p3, p4, p5].map(applyDismiss)
}
