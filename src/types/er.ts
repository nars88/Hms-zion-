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
  hasLabRequest?: boolean
  hasRadiologyRequest?: boolean
  hasSonarRequest?: boolean
  labUnreviewed?: boolean
  radiologyUnreviewed?: boolean
  sonarUnreviewed?: boolean
  hasPendingDiagnostics?: boolean
  billingStatus?: 'waiting_for_payment' | 'paid' | null
  pharmacyOrderStatus?: string | null
  medicineReady?: boolean
  pharmacyOutOfStock?: boolean
  labDiagnostic?: DiagnosticResult | null
  radiologyDiagnostic?: DiagnosticResult | null
  sonarDiagnostic?: DiagnosticResult | null
  doctorMedications?: string
  doctorLabTests?: string
  erOrders?: Array<{ type: string; content?: string; at: string; status?: string }>
  vitals: {
    bp: string
    temperature: number
    heartRate: number
    weight: number
  } | null
}

export type ResultCardType = 'Lab' | 'Radiology' | 'Sonar'

export type Severity = 'Red' | 'Yellow' | 'Green'

export interface ERTask {
  visitId: string
  patientName: string
  bedNumber: number | null
  type: string
  content?: string
  at: string
  status?: string
}
