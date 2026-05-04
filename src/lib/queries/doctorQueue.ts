export const DOCTOR_QUEUE_QUERY_KEY = ['doctor', 'queue', 'exam'] as const

export type ExamQueuePatient = {
  visitId: string
  patientId: string
  name: string
  age: number | null
  gender: string
  phone: string | null
  chiefComplaint: string | null
  triageLevel: number | null
  allergies: string | null
  urgencyLevel?: 'NORMAL' | 'MODERATE' | 'EMERGENCY'
  workflowStatus?:
    | 'WAITING_EXAM'
    | 'WAITING_RESULTS'
    | 'RESULTS_READY'
    | 'IN_CONSULTATION'
    | 'WAITING_FOR_RESULTS'
    | 'SENT_TO_TEST'
    | 'SENT_TO_LAB'
  vitals: {
    bp: string
    temperature: number
    heartRate: number
    weight: number
  } | null
}

export async function fetchDoctorQueueExamBuckets(): Promise<{
  queue: ExamQueuePatient[]
  readyForReview: ExamQueuePatient[]
  inProgress: ExamQueuePatient[]
}> {
  const res = await fetch('/api/doctor/queue')
  const raw = await res.json().catch(() => null)
  if (!res.ok) {
    const msg =
      raw && typeof raw === 'object' && raw !== null && 'error' in raw
        ? String((raw as { error?: string }).error)
        : `Request failed (${res.status})`
    throw new Error(msg)
  }
  const data = raw as {
    queue?: ExamQueuePatient[]
    readyForReview?: ExamQueuePatient[]
    inProgress?: ExamQueuePatient[]
  }
  return {
    queue: Array.isArray(data.queue) ? data.queue : [],
    readyForReview: Array.isArray(data.readyForReview) ? data.readyForReview : [],
    inProgress: Array.isArray(data.inProgress) ? data.inProgress : [],
  }
}
