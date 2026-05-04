'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import DoctorSidebar from '@/components/doctor/DoctorSidebar'
import { Search, ScanLine, AlertTriangle, UserRound, VenusAndMars } from 'lucide-react'
import { FaHourglassHalf, FaCheckCircle } from 'react-icons/fa'
import {
  DOCTOR_QUEUE_QUERY_KEY,
  fetchDoctorQueueExamBuckets,
  type ExamQueuePatient,
} from '@/lib/queries/doctorQueue'

const SELECTED_EXAM_VISIT_STORAGE_KEY = 'zion_doctor_exam_visitId'
const TEMP_DOCTOR_TEST_PATIENT: ExamQueuePatient = {
  visitId: 'TEMP-DR-VISIT-001',
  patientId: 'TEMP-DR-001',
  name: 'Doctor Preview Test',
  age: 34,
  gender: 'Female',
  phone: 'N/A',
  chiefComplaint: 'Prescription Builder verification',
  triageLevel: 2,
  allergies: 'None',
  urgencyLevel: 'NORMAL',
  workflowStatus: 'RESULTS_READY',
  vitals: {
    bp: '120/80',
    temperature: 36.8,
    heartRate: 78,
    weight: 64,
  },
}

// Display-only: collapse seed/test-patient clutter into at most two realistic
// cards. Real patient records and their DB rows are never modified here; this
// only reshapes what the doctor queue renders.
const TEST_PATIENT_NAME_PATTERN = /^\s*test\s*patient/i
const TEST_PATIENT_DISPLAY_NAMES: readonly string[] = ['John Doe', 'Jane Smith']

function writeStoredExamVisitId(visitId: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (visitId) sessionStorage.setItem(SELECTED_EXAM_VISIT_STORAGE_KEY, visitId)
    else sessionStorage.removeItem(SELECTED_EXAM_VISIT_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function getUrgencyMeta(level?: ExamQueuePatient['urgencyLevel']) {
  if (level === 'EMERGENCY') {
    return {
      label: 'Emergency',
      badgeClass: 'bg-red-500/20 text-red-200 border border-red-500/70 animate-pulse',
      cardClass: 'border-red-500/60 shadow-red-500/15',
    }
  }
  if (level === 'MODERATE') {
    return {
      label: 'Moderate',
      badgeClass: 'bg-amber-500/20 text-amber-200 border border-amber-500/60',
      cardClass: 'border-amber-500/50',
    }
  }
  return {
    label: 'Normal',
    badgeClass: 'bg-slate-700/50 text-slate-200 border border-slate-600/60',
    cardClass: 'border-slate-700/70',
  }
}

export default function DoctorQueueEntrancePage() {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const queueQuery = useQuery({
    queryKey: DOCTOR_QUEUE_QUERY_KEY,
    queryFn: fetchDoctorQueueExamBuckets,
    staleTime: 15_000,
    placeholderData: (previousData) => previousData,
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  })

  const examQueue = queueQuery.data?.queue ?? []
  const examReadyForReview = queueQuery.data?.readyForReview ?? []
  const examInProgress = queueQuery.data?.inProgress ?? []
  const loading = queueQuery.isPending && !queueQuery.data
  const error =
    queueQuery.error instanceof Error
      ? queueQuery.error.message
      : queueQuery.error
        ? String(queueQuery.error)
        : null

  const merged = useMemo(
    () => [TEMP_DOCTOR_TEST_PATIENT, ...examQueue, ...examReadyForReview, ...examInProgress],
    [examQueue, examReadyForReview, examInProgress]
  )

  // Display-only cleanup: keep real patients as-is, but collapse the seeded
  // "Test Patient X" rows to at most two cards with realistic names. The
  // underlying visitId / patientId stay intact so opening the workstation,
  // deduplication, and downstream queries all still work.
  const displayList = useMemo(() => {
    let testIdx = 0
    return merged.flatMap((p) => {
      if (!TEST_PATIENT_NAME_PATTERN.test(p.name)) return [p]
      if (testIdx >= TEST_PATIENT_DISPLAY_NAMES.length) return []
      const displayName = TEST_PATIENT_DISPLAY_NAMES[testIdx]
      testIdx += 1
      return [{ ...p, name: displayName }]
    })
  }, [merged])

  const openWorkstation = useCallback(
    (patient: ExamQueuePatient) => {
      writeStoredExamVisitId(patient.visitId)
      router.push(`/doctor/dashboard/${encodeURIComponent(patient.patientId)}`)
    },
    [router]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return displayList
    return displayList.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.patientId.toLowerCase().includes(q) ||
        p.visitId.toLowerCase().includes(q) ||
        (p.chiefComplaint && p.chiefComplaint.toLowerCase().includes(q))
      )
    })
  }, [displayList, search])

  return (
    <ProtectedRoute allowedRoles={['DOCTOR']} redirectTo="/">
      <div className="flex h-screen max-h-screen overflow-hidden bg-[#0a0f1e]">
        <DoctorSidebar />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-slate-800/40 bg-[#0a0f1e]">
          <div className="shrink-0 border-b border-slate-800/50 px-4 py-4 sm:px-6">
            <h1 className="text-xl font-bold tracking-tight text-white">Patient queue</h1>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
                  aria-hidden
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, patient ID, visit…"
                  className="h-12 w-full rounded-xl border border-slate-600/80 bg-[#111827] pl-10 pr-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl border border-slate-700/50 bg-[#111827] px-4 text-xs text-slate-500">
                <ScanLine className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Scanner ready</span>
              </div>
            </div>
            {error ? <p className="mt-3 text-sm text-amber-400">{error}</p> : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 [scrollbar-width:thin]">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-36 rounded-xl border border-slate-700/50 bg-[#111827]/80 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-16 text-center text-slate-500">
                {merged.length === 0 ? 'No patients in queue.' : 'No matches.'}
              </p>
            ) : (
              <div className="grid max-w-[1680px] gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((p) => {
                  const inRoom = examInProgress.some((x) => x.visitId === p.visitId)
                  const workflowStatus = inRoom ? 'IN_CONSULTATION' : p.workflowStatus || 'WAITING_EXAM'
                  const urgency = getUrgencyMeta(p.urgencyLevel)
                  const normalized = String(workflowStatus).toLowerCase()
                  const isWaitingResults =
                    normalized.includes('pending') ||
                    workflowStatus === 'WAITING_RESULTS' ||
                    workflowStatus === 'WAITING_FOR_RESULTS' ||
                    workflowStatus === 'SENT_TO_TEST' ||
                    workflowStatus === 'SENT_TO_LAB'
                  const isResultsReady =
                    normalized.includes('ready') || workflowStatus === 'RESULTS_READY'
                  const showWfr = isWaitingResults && !isResultsReady
                  const showRr = isResultsReady

                  return (
                    <button
                      key={p.visitId}
                      type="button"
                      onClick={() => openWorkstation(p)}
                      className={`relative flex min-h-[11rem] flex-col overflow-hidden rounded-xl border bg-[#111827] p-4 text-left shadow-sm transition-colors hover:border-blue-500/40 hover:bg-[#161e31] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                        urgency.cardClass
                      }`}
                    >
                      {showWfr ? (
                        <div className="absolute bottom-2 right-2 z-20 inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-medium text-yellow-400">
                          <FaHourglassHalf className="h-4 w-4 shrink-0" />
                          <span>W.F.R</span>
                        </div>
                      ) : null}
                      {showRr ? (
                        <div className="absolute bottom-2 right-2 z-20 inline-flex items-center gap-1 rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-500">
                          <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                            <span
                              className="absolute inline-flex h-full w-full rounded-full bg-green-400/35 opacity-75 animate-ping"
                              aria-hidden
                            />
                            <FaCheckCircle className="relative h-4 w-4" />
                          </span>
                          <span>R.R</span>
                        </div>
                      ) : null}
                      <div className="relative z-10 flex items-start justify-between gap-2">
                        <span className="truncate text-xl font-extrabold tracking-tight text-white">{p.name}</span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${urgency.badgeClass}`}>
                          {urgency.label}
                        </span>
                      </div>
                      <span className="mt-1 font-mono text-xs text-blue-300/90">ID {p.patientId}</span>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
                        <span className="inline-flex items-center gap-1">
                          <UserRound className="h-3.5 w-3.5 text-cyan-300" />
                          Age {p.age != null ? p.age : '—'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <VenusAndMars className="h-3.5 w-3.5 text-violet-300" />
                          {p.gender || '—'}
                        </span>
                      </div>
                      {p.vitals ? (
                        <div className="mt-auto pt-2 text-[11px] text-slate-400">
                          {p.vitals.bp} | {p.vitals.temperature}C | {p.vitals.heartRate} bpm
                        </div>
                      ) : null}
                      {p.urgencyLevel === 'EMERGENCY' ? (
                        <span className="inline-flex items-center gap-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-red-300">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          Emergency
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
