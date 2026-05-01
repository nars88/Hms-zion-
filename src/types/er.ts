/**
 * Shared types for ER (Emergency) module – used by Doctor and Nurse dashboards.
 */

export interface DiagnosticResult {
  summary: string
  attachmentPath?: string
  /** Radiology / Sonar — written by technician at “Send to doctor” */
  technicianNotes?: string
}

export interface ERPatient {
  visitId: string
  patientId: string
  name: string
  age: number | null
  gender: string
  chiefComplaint: string
  status: string
  triageLevel: number | null
  bedNumber: number | null
  labReady?: boolean
  radiologyReady?: boolean
  sonarReady?: boolean
  ecgReady?: boolean
  hasLabRequest?: boolean
  hasRadiologyRequest?: boolean
  hasSonarRequest?: boolean
  hasEcgRequest?: boolean
  labUnreviewed?: boolean
  radiologyUnreviewed?: boolean
  sonarUnreviewed?: boolean
  ecgUnreviewed?: boolean
  hasPendingDiagnostics?: boolean
  billingStatus?: 'waiting_for_payment' | 'paid' | null
  pharmacyOrderStatus?: string | null
  medicineReady?: boolean
  pharmacyOutOfStock?: boolean
  labDiagnostic?: DiagnosticResult | null
  radiologyDiagnostic?: DiagnosticResult | null
  sonarDiagnostic?: DiagnosticResult | null
  ecgDiagnostic?: DiagnosticResult | null
  doctorMedications?: string
  doctorLabTests?: string
  erOrders?: Array<{
    type: string
    content?: string
    at: string
    status?: string
    assigneeUserId?: string
  }>
  nurseTasksPending?: boolean
  nurseTasksComplete?: boolean
  criticalAlert?: boolean
  vitals: {
    bp: string
    temperature: number
    heartRate: number
    weight: number
    spo2?: number | null
    /** Set when recorded via ER Vitals Station API (e.g. ER_INTAKE_NURSE) */
    recordingSource?: string | null
  } | null
}

export type ResultCardType = 'Lab' | 'Radiology' | 'Sonar' | 'ECG'

export type Severity = 'Red' | 'Yellow' | 'Green'

export interface ERTask {
  taskId?: string
  visitId: string
  patientName: string
  bedNumber: number | null
  type: string
  content?: string
  at: string
  status?: string
  assigneeUserId?: string
  priority?: 'CRITICAL' | 'NORMAL'
  completedAt?: string
}
