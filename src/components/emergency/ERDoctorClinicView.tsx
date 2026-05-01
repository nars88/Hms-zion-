'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import {
  Activity,
  BedDouble,
  Stethoscope,
  Pill,
  FlaskConical,
  LogOut,
  X,
  Save,
  Send,
  FileText,
  LayoutGrid,
  ListTodo,
  Plus,
  Trash2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import type { ERPatient, ResultCardType } from '@/types/er'
import ERPatientBedCard from '@/components/emergency/ERPatientBedCard'
import {
  dismissSimDoctorAlerts,
  getDiagnosticSimErPatients,
  isDiagnosticUiSimEnabled,
  isSimVisitId,
  readSimulationFlagFromUrl,
} from '@/lib/diagnosticUiSim'
import { subscribeResultReady } from '@/lib/erClinicalBroadcast'
import { playErResultReadyChime } from '@/lib/erNotificationSound'

const TOTAL_BEDS = 12
const DEV_MOCK_ENABLED = process.env.NODE_ENV === 'development'
const DEV_MOCK_PATIENT: ERPatient = {
  visitId: 'DEV-MOCK-ER-VISIT-01',
  patientId: 'DEV-MOCK-PATIENT-01',
  name: 'حوراء باخت (اختبار)',
  age: 29,
  gender: 'Female',
  chiefComplaint: 'Emergency admission - UI/UX mock',
  status: 'ADMITTED',
  triageLevel: 2,
  bedNumber: 1,
  hasLabRequest: false,
  hasRadiologyRequest: false,
  hasSonarRequest: false,
  hasEcgRequest: false,
  hasPendingDiagnostics: false,
  billingStatus: 'waiting_for_payment',
  pharmacyOrderStatus: 'PENDING',
  medicineReady: true,
  pharmacyOutOfStock: false,
  doctorMedications: [
    'PRESCRIBED: Ibuprofen 400mg - q8h for 3 days',
    'DISPENSED: Paracetamol 500mg - q6h for 2 days',
  ].join('\n'),
  erOrders: [
    {
      type: 'VISIT_TYPE',
      content: 'EMERGENCY - NARS Hospital - Bed ID: ER-BED-01',
      at: new Date().toISOString(),
      status: 'DONE',
    },
    {
      type: 'BILLING',
      content: 'ER Admission Fee linked: 10,000 IQD',
      at: new Date().toISOString(),
      status: 'DONE',
    },
  ],
  vitals: {
    bp: '118/76',
    temperature: 37,
    heartRate: 88,
    weight: 64,
    spo2: 98,
    recordingSource: 'ER-Vitals',
  },
}

function resultsArrivedTab(p: ERPatient) {
  return Boolean(p.labReady || p.radiologyReady || p.sonarReady || p.ecgReady)
}

function activeQueueTab(p: ERPatient) {
  if (!resultsArrivedTab(p)) return true
  return Boolean(
    p.hasPendingDiagnostics ||
      p.labUnreviewed ||
      p.radiologyUnreviewed ||
      p.sonarUnreviewed ||
      p.ecgUnreviewed
  )
}

function getLatestDiagnosticFromNotes(
  notes: string | null | undefined,
  type: ResultCardType
): { summary: string; attachmentPath?: string; technicianNotes?: string } | null {
  if (!notes) return null
  try {
    const parsed = JSON.parse(notes) as Record<string, unknown>
    const key =
      type === 'Lab'
        ? 'labResults'
        : type === 'Radiology'
          ? 'radiologyResults'
          : type === 'Sonar'
            ? 'sonarResults'
            : 'ecgResults'
    const rows =
      ((parsed[key] as Array<{
        result?: string
        attachmentPath?: string
        technicianNotes?: string
        completedAt?: string
        releasedToDoctorAt?: string
      }>) || [])
        .slice()
        .sort((a, b) =>
          String(b.releasedToDoctorAt || b.completedAt || '').localeCompare(
            String(a.releasedToDoctorAt || a.completedAt || '')
          )
        )
    const latest = rows[0]
    if (!latest) return null
    return {
      summary: latest.result || '',
      attachmentPath: latest.attachmentPath,
      technicianNotes: latest.technicianNotes,
    }
  } catch {
    return null
  }
}

/** Safe to pass to window.open / <a target=_blank> — blocks blank tabs and dangerous schemes. */
function isNavigableAttachmentUrl(url: string): boolean {
  const s = url.trim()
  if (!s || /^about:blank$/i.test(s)) return false
  if (s.startsWith('//')) return false
  if (/^(javascript|vbscript):/i.test(s)) return false
  try {
    if (s.startsWith('data:image/') || s.startsWith('data:application/pdf')) {
      return s.length < 8_000_000
    }
    if (s.startsWith('data:')) return false
    if (s.startsWith('http://') || s.startsWith('https://')) {
      const u = new URL(s)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return false
      if (!u.hostname || u.hostname.length < 1) return false
      return true
    }
    if (s.startsWith('/')) {
      return s.length >= 2 && !/\s/.test(s)
    }
    if (s.startsWith('blob:')) {
      return s.length < 4096
    }
    return false
  } catch {
    return false
  }
}

function resolveAttachmentUrl(rawPath?: string) {
  if (!rawPath) return ''
  const trimmed = rawPath.trim()
  if (!trimmed) return ''
  let candidate = ''
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/')
  ) {
    candidate = trimmed
  } else if (trimmed.includes('/storage/v1/object/public/')) {
    candidate = trimmed
  } else {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    if (!supabaseUrl) candidate = trimmed
    else {
      const normalizedPath = trimmed.replace(/^\/+/, '')
      if (!normalizedPath) return ''
      candidate = `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${normalizedPath}`
    }
  }
  return isNavigableAttachmentUrl(candidate) ? candidate : ''
}

/** Main ER clinic board + tabs (no layout chrome — wrap with ERRoleSidebar in `/er/clinic`). */
export function ERDoctorClinicShell() {
  const [tab, setTab] = useState<'active' | 'results'>('active')
  const [erPatients, setErPatients] = useState<ERPatient[]>([])
  const [erLoading, setErLoading] = useState(true)
  const [erError, setErError] = useState<string | null>(null)
  const [simBanner, setSimBanner] = useState(false)
  const loadedOnceRef = useRef(false)
  const lastPatientsHashRef = useRef('')

  const fetchErPatients = useCallback(async () => {
    try {
      if (!loadedOnceRef.current) setErLoading(true)
      setErError(null)
      const res = await fetch('/api/emergency/patients')
      if (!res.ok) throw new Error('Failed to load ER patients')
      const rawList = await res.json()
      const apiList = Array.isArray(rawList) ? rawList : []
      const withSim =
        typeof window !== 'undefined' && isDiagnosticUiSimEnabled()
          ? [...getDiagnosticSimErPatients(), ...apiList]
          : apiList
      const nextList = DEV_MOCK_ENABLED
        ? [DEV_MOCK_PATIENT, ...withSim.filter((p) => p.visitId !== DEV_MOCK_PATIENT.visitId)]
        : withSim
      const nextHash = JSON.stringify(nextList)
      if (lastPatientsHashRef.current !== nextHash) {
        lastPatientsHashRef.current = nextHash
        setErPatients(nextList)
      }
    } catch (e: unknown) {
      setErError((e as Error)?.message || 'Failed to load patients')
      if (!loadedOnceRef.current) setErPatients([])
    } finally {
      loadedOnceRef.current = true
      setErLoading(false)
      setSimBanner(isDiagnosticUiSimEnabled())
    }
  }, [])

  useEffect(() => {
    readSimulationFlagFromUrl()
    void fetchErPatients()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void fetchErPatients()
    }
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void fetchErPatients()
    }, 15000)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchErPatients])
  const unreadResultsCount = new Set(
    erPatients
      .filter((p) => p.labUnreviewed || p.radiologyUnreviewed || p.sonarUnreviewed || p.ecgUnreviewed)
      .map((p) => p.visitId)
  ).size

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-6xl space-y-4">
          {simBanner ? (
            <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              Ephemeral diagnostic simulation: mock patients on beds 1–5 are client-side only. Full page refresh
              removes them.
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
            <button
              type="button"
              onClick={() => setTab('active')}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                tab === 'active'
                  ? 'border border-cyan-500/40 bg-cyan-500/15 text-cyan-200'
                  : 'border border-transparent text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
              }`}
            >
              Active Queue
            </button>
            <button
              type="button"
              onClick={() => setTab('results')}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                tab === 'results'
                  ? 'border border-cyan-500/40 bg-cyan-500/15 text-cyan-200'
                  : 'border border-transparent text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                Results Arrived
                {unreadResultsCount > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-bold text-white">
                    {unreadResultsCount}
                  </span>
                ) : null}
              </span>
            </button>
          </div>
          <ERClinicBoard
            patients={erPatients}
            loading={erLoading}
            error={erError}
            fetchPatients={fetchErPatients}
            onSwitchToResultsTab={() => setTab('results')}
            heading={tab === 'active' ? 'ER Doctor Clinic — Active Queue' : 'ER Doctor Clinic — Results Arrived'}
            subheading={
              tab === 'active'
                ? 'Vitals from Vitals Station; assign tasks from the bed drawer.'
                : 'Patients with released Lab / X-Ray / Sonar / ECG results.'
            }
            patientFilter={tab === 'active' ? activeQueueTab : resultsArrivedTab}
          />
        </div>
      </main>
    </div>
  )
}

function ERClinicBoard({
  patients,
  loading,
  error,
  fetchPatients,
  onSwitchToResultsTab,
  heading,
  subheading,
  patientFilter,
}: {
  patients: ERPatient[]
  loading: boolean
  error: string | null
  fetchPatients: () => void | Promise<void>
  onSwitchToResultsTab?: () => void
  heading?: string
  subheading?: string
  patientFilter?: (p: ERPatient) => boolean
}) {
  const { user } = useAuth()
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'alert'
    onClick?: () => void
    hint?: string
  } | null>(null)
  const [livePulseVisitIds, setLivePulseVisitIds] = useState<Set<string>>(() => new Set())
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedBedNumber, setSelectedBedNumber] = useState<number | null>(null)
  const [resultCard, setResultCard] = useState<{ type: ResultCardType; patient: ERPatient } | null>(null)
  const [attachmentOverlayUrl, setAttachmentOverlayUrl] = useState<string | null>(null)
  const [requestModal, setRequestModal] = useState<{
    visitId: string
    patientId: string
    patientName: string
    bedNumber: number
    department: 'Lab' | 'Radiology' | 'Sonar' | 'ECG'
  } | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [attachmentPreviewFailed, setAttachmentPreviewFailed] = useState(false)
  const seenTaskIdsRef = useRef<Set<string>>(new Set())
  const sinceRef = useRef<string>(new Date(Date.now() - 5000).toISOString())
  const pendingOpenRef = useRef<{ visitId: string; type: ResultCardType } | null>(null)
  const liveToastGenRef = useRef(0)

  const showToast = (message: string, type: 'success' | 'alert') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const markResultReviewed = async (
    visitId: string,
    type: ResultCardType,
    options?: { skipRefresh?: boolean }
  ) => {
    if (isSimVisitId(visitId)) {
      dismissSimDoctorAlerts(visitId, type)
      if (!options?.skipRefresh) void fetchPatients()
      return
    }
    try {
      await fetch('/api/emergency/doctor/result-reviewed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId, department: type }),
      })
      if (!options?.skipRefresh) void fetchPatients()
    } catch (_) {}
  }

  const openResultModal = async (type: ResultCardType, patient: ERPatient) => {
    const ready =
      (type === 'Lab' && patient.labReady) ||
      (type === 'Radiology' && patient.radiologyReady) ||
      (type === 'Sonar' && patient.sonarReady) ||
      (type === 'ECG' && patient.ecgReady)
    if (!ready) return

    const hasInlineDiagnostic =
      (type === 'Lab' && patient.labDiagnostic) ||
      (type === 'Radiology' && patient.radiologyDiagnostic) ||
      (type === 'Sonar' && patient.sonarDiagnostic) ||
      (type === 'ECG' && patient.ecgDiagnostic)

    let enrichedPatient = patient
    if (!hasInlineDiagnostic) {
      try {
        const res = await fetch(`/api/visits/${encodeURIComponent(patient.visitId)}`)
        if (res.ok) {
          const payload = (await res.json()) as { visit?: { notes?: string | null } }
          const fromVisit = getLatestDiagnosticFromNotes(payload.visit?.notes, type)
          if (fromVisit) {
            enrichedPatient = {
              ...patient,
              labDiagnostic: type === 'Lab' ? fromVisit : patient.labDiagnostic,
              radiologyDiagnostic: type === 'Radiology' ? fromVisit : patient.radiologyDiagnostic,
              sonarDiagnostic: type === 'Sonar' ? fromVisit : patient.sonarDiagnostic,
              ecgDiagnostic: type === 'ECG' ? fromVisit : patient.ecgDiagnostic,
            }
          }
        }
      } catch {
        // Keep existing card behavior even if fallback fetch fails.
      }
    }

    void markResultReviewed(patient.visitId, type)
    setResultCard({ type, patient: enrichedPatient })
  }

  const openResultModalRef = useRef(openResultModal)
  openResultModalRef.current = openResultModal

  const handleLiveResultReady = useCallback(
    (ev: {
      taskId: string
      visitId: string
      patientName: string
      testType: string
      resultCardType: ResultCardType
      releasedAt?: string
    }) => {
      if (seenTaskIdsRef.current.has(ev.taskId)) return
      seenTaskIdsRef.current.add(ev.taskId)
      playErResultReadyChime()
      setLivePulseVisitIds((prev) => new Set(prev).add(ev.visitId))
      window.setTimeout(() => {
        setLivePulseVisitIds((prev) => {
          const n = new Set(prev)
          n.delete(ev.visitId)
          return n
        })
      }, 120_000)
      const g = ++liveToastGenRef.current
      setToast({
        message: `New Result: ${ev.patientName} — ${ev.testType}`,
        type: 'success',
        hint: 'Tap to open results',
        onClick: () => {
          liveToastGenRef.current += 1
          setToast(null)
          onSwitchToResultsTab?.()
          pendingOpenRef.current = { visitId: ev.visitId, type: ev.resultCardType }
          void fetchPatients()
        },
      })
      window.setTimeout(() => {
        setToast((t) => (liveToastGenRef.current === g ? null : t))
      }, 10_000)
    },
    [fetchPatients, onSwitchToResultsTab]
  )

  useEffect(() => {
    const pending = pendingOpenRef.current
    if (!pending) return
    const pat = patients.find((p) => p.visitId === pending.visitId)
    if (!pat) return
    const ok =
      (pending.type === 'Lab' && pat.labReady && pat.labDiagnostic) ||
      (pending.type === 'Radiology' && pat.radiologyReady && pat.radiologyDiagnostic) ||
      (pending.type === 'Sonar' && pat.sonarReady && pat.sonarDiagnostic) ||
      (pending.type === 'ECG' && pat.ecgReady && pat.ecgDiagnostic)
    if (!ok) return
    pendingOpenRef.current = null
    void openResultModalRef.current(pending.type, pat)
  }, [patients])

  useEffect(() => {
    setAttachmentPreviewFailed(false)
    setAttachmentOverlayUrl(null)
  }, [resultCard?.type, resultCard?.patient.visitId])

  useEffect(() => {
    return subscribeResultReady((data) => {
      handleLiveResultReady({
        taskId: data.taskId,
        visitId: data.visitId,
        patientName: data.patientName,
        testType: data.testType,
        resultCardType: data.resultCardType,
        releasedAt: data.at,
      })
    })
  }, [handleLiveResultReady])

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const res = await fetch(
          `/api/emergency/result-notifications?since=${encodeURIComponent(sinceRef.current)}`
        )
        if (!res.ok || cancelled) return
        const data = (await res.json()) as {
          events?: Array<{
            taskId: string
            visitId: string
            patientName: string
            testType: string
            resultCardType: ResultCardType
            releasedAt: string
          }>
        }
        const events = data.events ?? []
        let maxTs = sinceRef.current
        for (const ev of events) {
          if (ev.releasedAt > maxTs) maxTs = ev.releasedAt
          handleLiveResultReady(ev)
        }
        if (events.length > 0) sinceRef.current = maxTs
      } catch {
        /* ignore */
      }
    }
    const id = window.setInterval(() => void tick(), 15000)
    void tick()
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [handleLiveResultReady])

  const bedMap = new Map<number, ERPatient>()
  patients.forEach((p) => {
    if (p.bedNumber == null) return
    if (patientFilter && !patientFilter(p)) return
    bedMap.set(p.bedNumber, p)
  })

  const openDrawer = (bedNum: number) => {
    const patient = bedMap.get(bedNum)
    if (!patient) {
      showToast('No patient in this bed.', 'alert')
      return
    }
    void clearUnreadResultsForPatient(patient)
    setSelectedBedNumber(bedNum)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setSelectedBedNumber(null)
  }

  const clearUnreadResultsForPatient = async (p: ERPatient) => {
    const deps: ResultCardType[] = []
    if (p.labUnreviewed) deps.push('Lab')
    if (p.radiologyUnreviewed) deps.push('Radiology')
    if (p.sonarUnreviewed) deps.push('Sonar')
    if (p.ecgUnreviewed) deps.push('ECG')
    if (deps.length === 0) return
    await Promise.all(deps.map((d) => markResultReviewed(p.visitId, d, { skipRefresh: true })))
    void fetchPatients()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {toast ? (
        <div className="fixed top-6 right-6 z-[100] max-w-sm animate-in fade-in slide-in-from-top-2 duration-300">
          {toast.onClick ? (
            <button
              type="button"
              onClick={() => toast.onClick?.()}
              className={`w-full rounded-xl border px-4 py-3 text-left shadow-xl backdrop-blur-md transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-violet-400/60 ${
                toast.type === 'success'
                  ? 'border-emerald-400/40 bg-slate-900/95 text-emerald-100'
                  : 'border-amber-400/40 bg-slate-900/95 text-amber-100'
              }`}
            >
              <p className="text-sm font-semibold leading-snug">{toast.message}</p>
              {toast.hint ? <p className="mt-1 text-xs text-slate-400">{toast.hint}</p> : null}
            </button>
          ) : (
            <div
              className={`rounded-xl border px-5 py-3 shadow-lg ${
                toast.type === 'success'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
              }`}
            >
              {toast.message}
            </div>
          )}
        </div>
      ) : null}

      {(error || localError) && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-400">
          {error || localError}
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Bed grid
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
            {Array.from({ length: TOTAL_BEDS }, (_, i) => (
              <div key={i} className="h-44 rounded-xl border border-slate-800/60 bg-slate-900/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
            {Array.from({ length: TOTAL_BEDS }, (_, i) => {
              const bedNum = i + 1
              const patient = bedMap.get(bedNum)
              return (
                <ERPatientBedCard
                  key={bedNum}
                  bedNum={bedNum}
                  patient={patient}
                  liveResultReadyHighlight={Boolean(patient && livePulseVisitIds.has(patient.visitId))}
                  onOpenDrawer={openDrawer}
                  onResultClick={(e, type, p) => {
                    e.stopPropagation()
                    void openResultModal(type, p)
                  }}
                />
              )
            })}
          </div>
        )}
      </section>

      {drawerOpen && selectedBedNumber !== null && bedMap.get(selectedBedNumber) && (
        <ERDoctorDrawer
          patient={bedMap.get(selectedBedNumber)!}
          doctorId={user?.id ?? ''}
          onClose={closeDrawer}
          onSaved={() => void fetchPatients()}
          showToast={showToast}
          setError={setLocalError}
        />
      )}

      {resultCard && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" aria-hidden onClick={() => setResultCard(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-700 p-4">
                <h3 className="text-lg font-semibold text-slate-100">
                  {resultCard.type === 'Lab'
                    ? '🧪 Lab'
                    : resultCard.type === 'Radiology'
                      ? '🩻 X-Ray'
                      : resultCard.type === 'Sonar'
                        ? '📡 Sonar'
                        : '📈 ECG'}{' '}
                  Result
                </h3>
                <button type="button" onClick={() => setResultCard(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                <p className="mb-4 text-sm text-slate-400">
                  Bed {resultCard.patient.bedNumber} — {resultCard.patient.name}
                </p>
                {(() => {
                  const activeDiagnostic =
                    resultCard.type === 'Lab'
                      ? resultCard.patient.labDiagnostic
                      : resultCard.type === 'Radiology'
                        ? resultCard.patient.radiologyDiagnostic
                        : resultCard.type === 'Sonar'
                          ? resultCard.patient.sonarDiagnostic
                          : resultCard.patient.ecgDiagnostic
                  const headerLabel =
                    resultCard.type === 'Lab'
                      ? 'Lab Result'
                      : resultCard.type === 'Radiology'
                        ? 'Radiology Report'
                        : resultCard.type === 'Sonar'
                          ? 'Sonar Report'
                          : 'ECG Report'
                  const attachmentUrl = resolveAttachmentUrl(activeDiagnostic?.attachmentPath)
                  const openFullAttachment = () => {
                    if (!attachmentUrl || !isNavigableAttachmentUrl(attachmentUrl)) return
                    const popup = window.open(attachmentUrl, '_blank', 'noopener,noreferrer')
                    if (!popup) {
                      setAttachmentOverlayUrl(attachmentUrl)
                    }
                  }

                  return (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <section className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
                        <p className="mb-2 text-sm font-semibold text-slate-200">{headerLabel}</p>
                        <pre className="whitespace-pre-wrap text-sm text-slate-200">{activeDiagnostic?.summary || '—'}</pre>
                      </section>

                      <section className="rounded-lg border border-slate-700 bg-slate-800/40 p-4">
                        <p className="mb-2 text-sm font-semibold text-slate-200">Attachment</p>
                        {!attachmentUrl ? (
                          <p className="text-sm text-slate-500">No attachment uploaded.</p>
                        ) : attachmentPreviewFailed ? (
                          <a
                            href={attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-500/30"
                          >
                            Download Attachment
                          </a>
                        ) : (
                          <div className="space-y-3">
                            <img
                              src={attachmentUrl}
                              alt={`${headerLabel} attachment`}
                              loading="lazy"
                              className="h-56 w-full rounded-lg border border-slate-700 object-cover bg-slate-900"
                              onError={() => setAttachmentPreviewFailed(true)}
                            />
                            <button
                              type="button"
                              onClick={openFullAttachment}
                              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-500/30"
                            >
                              View Full Attachment
                            </button>
                          </div>
                        )}
                      </section>

                      {resultCard.type !== 'Lab' &&
                      (resultCard.type === 'Radiology'
                        ? resultCard.patient.radiologyDiagnostic?.technicianNotes
                        : resultCard.type === 'Sonar'
                          ? resultCard.patient.sonarDiagnostic?.technicianNotes
                          : resultCard.patient.ecgDiagnostic?.technicianNotes) ? (
                        <section className="rounded-lg border border-sky-500/25 bg-slate-800/40 p-4 lg:col-span-2">
                          <p className="mb-2 text-sm font-semibold text-sky-300">Technician Notes</p>
                          <pre className="whitespace-pre-wrap text-sm text-slate-200">
                            {resultCard.type === 'Radiology'
                              ? resultCard.patient.radiologyDiagnostic?.technicianNotes
                              : resultCard.type === 'Sonar'
                                ? resultCard.patient.sonarDiagnostic?.technicianNotes
                                : resultCard.patient.ecgDiagnostic?.technicianNotes}
                          </pre>
                        </section>
                      ) : null}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </>
      )}
      {attachmentOverlayUrl ? (
        <>
          <div
            className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm"
            aria-hidden
            onClick={() => setAttachmentOverlayUrl(null)}
          />
          <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
            <div
              className="relative w-full max-w-5xl rounded-xl border border-slate-700 bg-slate-950 p-3 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setAttachmentOverlayUrl(null)}
                className="absolute right-3 top-3 rounded-md bg-slate-900/80 p-2 text-slate-300 hover:bg-slate-800"
                aria-label="Close attachment preview"
              >
                <X className="h-4 w-4" />
              </button>
              <img
                src={attachmentOverlayUrl}
                alt="Full attachment preview"
                className="max-h-[82vh] w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </>
      ) : null}

      {requestModal && (
        <RequestDiagnosticModal
          visitId={requestModal.visitId}
          patientName={requestModal.patientName}
          bedNumber={requestModal.bedNumber}
          department={requestModal.department}
          onClose={() => setRequestModal(null)}
          onSent={() => {
            setRequestModal(null)
            void fetchPatients()
          }}
          showToast={showToast}
        />
      )}
    </div>
  )
}

interface RequestDiagnosticModalProps {
  visitId: string
  patientName: string
  bedNumber: number
  department: 'Lab' | 'Radiology' | 'Sonar' | 'ECG'
  onClose: () => void
  onSent: () => void
  showToast: (message: string, type: 'success' | 'alert') => void
}

function RequestDiagnosticModal({
  visitId,
  patientName,
  bedNumber,
  department,
  onClose,
  onSent,
  showToast,
}: RequestDiagnosticModalProps) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  const label =
    department === 'Lab'
      ? '🧪 Lab'
      : department === 'Radiology'
        ? '🩻 X-Ray'
        : department === 'Sonar'
          ? '🔉 Sonar'
          : '📈 ECG'
  const placeholder =
    department === 'Lab'
      ? 'e.g. CBC, Blood culture'
      : department === 'Radiology'
        ? 'e.g. Chest X-Ray'
        : department === 'Sonar'
          ? 'e.g. Abdomen ultrasound'
          : 'e.g. 12-lead ECG, rhythm strip'

  const handleSubmit = async () => {
    const trimmed = content.trim()
    if (!trimmed) {
      showToast('Enter tests or impression.', 'alert')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/emergency/doctor/lab-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId, content: trimmed, department }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to send request')
      }
      showToast(`${label} request sent.`, 'success')
      onSent()
    } catch (e: unknown) {
      showToast((e as Error)?.message || 'Failed to send', 'alert')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" aria-hidden onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100">
              Request {label} — Bed {bedNumber} — {patientName}
            </h3>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <label className="block text-xs text-slate-400">Tests / impression</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg bg-slate-600/50 text-slate-300 text-sm font-medium hover:bg-slate-500/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={sending || !content.trim()}
                className="flex-1 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 text-sm font-medium hover:bg-cyan-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

interface ERDoctorDrawerProps {
  patient: ERPatient
  doctorId: string
  onClose: () => void
  onSaved: () => void
  showToast: (message: string, type: 'success' | 'alert') => void
  setError: (e: string | null) => void
}

type DiagnosticDept = 'Lab' | 'Radiology' | 'Sonar' | 'ECG'
type DiagnosticDraft = {
  id: string
  department: DiagnosticDept
  testName: string
  note: string
}
type MedicationDraft = {
  id: string
  drugName: string
  dose: string
  frequency: string
  duration: string
  quantity: number
}

type AssignTaskDraft = {
  id: string
  preset: 'Injection' | 'IV' | 'Dressing' | 'Other'
  instruction: string
}

const TASK_PRESET_CONFIG: Record<
  AssignTaskDraft['preset'],
  { serviceCode: string | null; titlePrefix: string; department: string }
> = {
  Injection: { serviceCode: 'NURSING_IV_DRIP', titlePrefix: 'Injection', department: 'NURSING' },
  IV: { serviceCode: 'NURSING_IV_DRIP', titlePrefix: 'IV / fluids', department: 'NURSING' },
  Dressing: { serviceCode: 'NURSING_DRESSING', titlePrefix: 'Dressing / wound care', department: 'NURSING' },
  Other: { serviceCode: null, titlePrefix: 'Other nurse task', department: 'NURSING' },
}

function makeTaskDraft(): AssignTaskDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    preset: 'Injection',
    instruction: '',
  }
}

function makeDiagnosticDraft(): DiagnosticDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    department: 'Lab',
    testName: '',
    note: '',
  }
}

function makeMedicationDraft(): MedicationDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    drugName: '',
    dose: '',
    frequency: '',
    duration: '',
    quantity: 1,
  }
}

function ERDoctorDrawer({ patient, doctorId, onClose, onSaved, showToast, setError }: ERDoctorDrawerProps) {
  const [diagnosticItems, setDiagnosticItems] = useState<DiagnosticDraft[]>([makeDiagnosticDraft()])
  const [medicationItems, setMedicationItems] = useState<MedicationDraft[]>([makeMedicationDraft()])
  const [saving, setSaving] = useState(false)
  const [sendingPharmacy, setSendingPharmacy] = useState(false)
  const [sendingLab, setSendingLab] = useState(false)
  const [discharging, setDischarging] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignTasks, setAssignTasks] = useState<AssignTaskDraft[]>([makeTaskDraft()])
  const [assignSending, setAssignSending] = useState(false)
  const hasPendingLabResults = Boolean(
    patient.erOrders?.some((o) => ['LAB', 'LAB_REQUESTED'].includes(o.type)) && !patient.labReady
  )

  useEffect(() => {
    setDiagnosticItems([makeDiagnosticDraft()])
    setMedicationItems([makeMedicationDraft()])
  }, [patient.visitId])

  const saveOrders = async () => {
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/emergency/doctor/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: patient.visitId,
          medications:
            medicationItems
              .map((item) => `${item.drugName.trim()} ${item.dose.trim()} - ${item.frequency.trim()} ${item.duration.trim()}`.trim())
              .filter(Boolean)
              .join('\n') || undefined,
          labTests:
            diagnosticItems
              .map((item) => `${item.department}: ${item.testName.trim()} ${item.note.trim()}`.trim())
              .filter(Boolean)
              .join('\n') || undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to save orders')
      }
      showToast('Orders saved. Floor nurses will see follow-up tasks.', 'success')
      onSaved()
    } catch (e: unknown) {
      const err = e as Error
      setError(err?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const sendToPharmacy = async () => {
    const payloadItems = medicationItems
      .map((item) => ({
        medicineName: item.drugName.trim(),
        dosage: item.dose.trim(),
        frequency: item.frequency.trim(),
        duration: item.duration.trim(),
        quantity: Math.max(1, Number(item.quantity) || 1),
      }))
      .filter((item) => item.medicineName.length > 0)
    if (payloadItems.length === 0) {
      setError('Enter medications first.')
      return
    }
    setError(null)
    setSendingPharmacy(true)
    try {
      const res = await fetch('/api/doctor/visit/send-to-pharmacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: patient.visitId,
          patientId: patient.patientId,
          doctorId,
          prescriptionItems: payloadItems,
          diagnosis: patient.chiefComplaint || 'ER',
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to send to pharmacy')
      }
      await fetch('/api/emergency/doctor/append-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: patient.visitId, type: 'PHARMACY_SENT', status: 'DONE' }),
      }).catch(() => {})
      showToast('Sent to Pharmacy & Finance. Nurse task updated.', 'success')
      setMedicationItems([makeMedicationDraft()])
      onSaved()
    } catch (e: unknown) {
      const err = e as Error
      setError(err?.message || 'Failed to send to pharmacy')
    } finally {
      setSendingPharmacy(false)
    }
  }

  const requestLab = async () => {
    const payloadItems = diagnosticItems
      .map((item) => ({
        department: item.department,
        testName: item.testName.trim(),
        note: item.note.trim(),
      }))
      .filter((item) => item.testName.length > 0)

    if (payloadItems.length === 0) {
      setError('Enter tests / impression first.')
      return
    }
    setError(null)
    setSendingLab(true)
    try {
      const res = await fetch('/api/emergency/doctor/lab-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: patient.visitId, items: payloadItems }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to request')
      }
      showToast(`${payloadItems.length} diagnostic request(s) sent.`, 'success')
      setDiagnosticItems([makeDiagnosticDraft()])
      onSaved()
    } catch (e: unknown) {
      const err = e as Error
      setError(err?.message || 'Failed')
    } finally {
      setSendingLab(false)
    }
  }

  const readyForDischarge = async () => {
    setError(null)
    setDischarging(true)
    try {
      const res = await fetch('/api/emergency/doctor/ready-for-discharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: patient.visitId }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed')
      }
      showToast('Patient is now in Pending Payment. Accountant can process payment and free the bed.', 'success')
      onSaved()
      onClose()
    } catch (e: unknown) {
      const err = e as Error
      setError(err?.message || 'Failed')
    } finally {
      setDischarging(false)
    }
  }

  const handlePrintSummary = async () => {
    try {
      const res = await fetch(`/api/emergency/visit-summary?visitId=${encodeURIComponent(patient.visitId)}`)
      if (!res.ok) throw new Error('Failed to load summary')
      const data = await res.json()
      const { printMedicalSummary } = await import('@/lib/printUtils')
      printMedicalSummary(data)
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Failed to print summary')
    }
  }

  const submitAssignTask = async () => {
    const payloadTasks = assignTasks
      .map((row) => ({ ...row, instruction: row.instruction.trim() }))
      .filter((row) => row.instruction.length > 0)

    if (payloadTasks.length === 0) {
      setError('Enter at least one task instruction for the nurse.')
      return
    }
    setAssignSending(true)
    setError(null)
    try {
      const requestBody = {
        visitId: patient.visitId,
        tasks: payloadTasks.map((row) => {
          const config = TASK_PRESET_CONFIG[row.preset]
          return {
            type: 'NURSE_TASK',
            title: `${config.titlePrefix}: ${row.instruction}`,
            category: 'NURSING',
            billDepartment: config.department,
            ...(config.serviceCode ? { serviceCode: config.serviceCode } : {}),
          }
        }),
      }
      const res = await fetch('/api/er/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        console.error('Assign nurse task failed:', {
          status: res.status,
          statusText: res.statusText,
          response: d,
          payload: requestBody,
        })
        throw new Error((d as { error?: string }).error || 'Failed to assign task')
      }
      const data = await res.json().catch(() => ({} as { tasks?: unknown[] }))
      const count = Array.isArray((data as { tasks?: unknown[] }).tasks) ? (data as { tasks: unknown[] }).tasks.length : payloadTasks.length
      showToast(`${count} task(s) sent to floor nurses and added to billing.`, 'success')
      setAssignOpen(false)
      setAssignTasks([makeTaskDraft()])
      onSaved()
    } catch (e: unknown) {
      console.error('submitAssignTask error:', e)
      setError((e as Error).message || 'Failed')
    } finally {
      setAssignSending(false)
    }
  }

  return (
    <>
      {assignOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            aria-hidden
            onClick={() => !assignSending && setAssignOpen(false)}
          />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div
              className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-lg font-semibold text-slate-100">Assign nurse task</h4>
              <p className="mt-1 text-xs text-slate-500">General ER nurse pool (multi-task assign)</p>
              <div className="mt-4 space-y-3">
                {assignTasks.map((row, idx) => (
                  <div key={row.id} className="rounded-lg border border-slate-700/70 bg-slate-800/35 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-300">Task {idx + 1}</span>
                      {assignTasks.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => setAssignTasks((prev) => prev.filter((x) => x.id !== row.id))}
                          className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <label className="block text-xs text-slate-400">Type</label>
                    <select
                      value={row.preset}
                      onChange={(e) =>
                        setAssignTasks((prev) =>
                          prev.map((x) =>
                            x.id === row.id ? { ...x, preset: e.target.value as AssignTaskDraft['preset'] } : x
                          )
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                    >
                      <option value="Injection">Injection</option>
                      <option value="IV">IV / fluids</option>
                      <option value="Dressing">Dressing / wound care</option>
                      <option value="Other">Other</option>
                    </select>
                    <label className="mt-3 block text-xs text-slate-400">Instructions</label>
                    <textarea
                      value={row.instruction}
                      onChange={(e) =>
                        setAssignTasks((prev) => prev.map((x) => (x.id === row.id ? { ...x, instruction: e.target.value } : x)))
                      }
                      rows={3}
                      placeholder="e.g. Ceftriaxone 1g IM left deltoid"
                      className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  disabled={assignSending}
                  onClick={() => setAssignTasks((prev) => [...prev, makeTaskDraft()])}
                  className="w-full rounded-lg border border-cyan-500/50 bg-cyan-500/10 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20"
                >
                  + Add Task
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={assignSending}
                  onClick={() => setAssignOpen(false)}
                  className="flex-1 rounded-lg bg-slate-600/50 py-2 text-sm font-medium text-slate-300 hover:bg-slate-500/50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={assignSending || !assignTasks.some((t) => t.instruction.trim())}
                  onClick={() => void submitAssignTask()}
                  className="flex-1 rounded-lg border border-violet-500/50 bg-violet-500/20 py-2 text-sm font-semibold text-violet-200 hover:bg-violet-500/30 disabled:opacity-50"
                >
                  {assignSending ? 'Sending…' : 'Assign'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" aria-hidden onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-slate-900 border-l border-slate-700/80 shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700/80 flex-shrink-0">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-cyan-400" />
            Bed {patient.bedNumber} — {patient.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* View Vitals (from nurse) */}
          <section>
            <h4 className="text-sm font-semibold text-slate-200 mb-2 flex flex-wrap items-center gap-2">
              <Stethoscope className="h-4 w-4 text-emerald-400" />
              Vitals (from Vitals Station)
              {patient.vitals?.recordingSource === 'ER-Vitals' ? (
                <span className="rounded-md border border-cyan-500/40 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                  ER-Vitals
                </span>
              ) : null}
            </h4>
            {patient.vitals ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div className="rounded-md bg-slate-800/50 px-2.5 py-1.5">
                    <span className="text-[10px] text-slate-500">BP</span>
                    <p className="text-sm font-semibold text-slate-200">{patient.vitals.bp}</p>
                  </div>
                  <div className="rounded-md bg-slate-800/50 px-2.5 py-1.5">
                    <span className="text-[10px] text-slate-500">HR</span>
                    <p className="text-sm font-semibold text-slate-200">{patient.vitals.heartRate} bpm</p>
                  </div>
                  <div className="rounded-md bg-slate-800/50 px-2.5 py-1.5">
                    <span className="text-[10px] text-slate-500">Temp</span>
                    <p className="text-sm font-semibold text-slate-200">{patient.vitals.temperature} °C</p>
                  </div>
                  <div className="rounded-md bg-slate-800/50 px-2.5 py-1.5">
                    <span className="text-[10px] text-slate-500">SpO₂</span>
                    <p className="text-sm font-semibold text-slate-200">
                      {patient.vitals.spo2 != null ? `${patient.vitals.spo2}%` : '—'}
                    </p>
                  </div>
                </div>
                <div className="rounded-md bg-slate-800/40 px-2.5 py-1 text-xs">
                  <span className="text-[10px] text-slate-500">Weight</span>
                  <p className="text-sm font-medium text-slate-200">{patient.vitals.weight} kg</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No vitals recorded yet.</p>
            )}
            <button
              type="button"
              onClick={() => {
                setAssignTasks([makeTaskDraft()])
                setAssignOpen(true)
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/70 bg-violet-500/30 py-3.5 text-base font-bold text-violet-100 shadow-[0_0_24px_rgba(168,85,247,0.22)] hover:bg-violet-500/40"
            >
              <ListTodo className="h-5 w-5" />
              Assign Task
            </button>
            <p className="mt-2 text-[10px] text-slate-500">
              Floor nurses receive this task. Completion shows a green check on this bed card.
            </p>
          </section>

          {/* Group 1: Diagnostics */}
          <section className="space-y-3 rounded-xl border border-slate-700/70 bg-slate-800/25 p-3">
            <h4 className="text-sm font-semibold text-cyan-200">Diagnostics</h4>
            {diagnosticItems.map((row, idx) => (
              <div key={row.id} className="rounded-lg border border-slate-700/70 bg-slate-900/40 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-300">Diagnostic {idx + 1}</p>
                  {diagnosticItems.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setDiagnosticItems((prev) => prev.filter((item) => item.id !== row.id))}
                      className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={row.department}
                    onChange={(e) =>
                      setDiagnosticItems((prev) =>
                        prev.map((item) =>
                          item.id === row.id ? { ...item, department: e.target.value as DiagnosticDept } : item
                        )
                      )
                    }
                    className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 text-sm"
                  >
                    <option value="Lab">Lab</option>
                    <option value="Radiology">X-Ray</option>
                    <option value="Sonar">Sonar</option>
                    <option value="ECG">ECG</option>
                  </select>
                  <input
                    value={row.testName}
                    onChange={(e) =>
                      setDiagnosticItems((prev) =>
                        prev.map((item) => (item.id === row.id ? { ...item, testName: e.target.value } : item))
                      )
                    }
                    placeholder="Test name"
                    className="col-span-2 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm"
                  />
                </div>
                <input
                  value={row.note}
                  onChange={(e) =>
                    setDiagnosticItems((prev) =>
                      prev.map((item) => (item.id === row.id ? { ...item, note: e.target.value } : item))
                    )
                  }
                  placeholder="Note / priority (e.g. urgent)"
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm"
                />
              </div>
            ))}
            <button
              type="button"
              disabled={sendingLab}
              onClick={() => setDiagnosticItems((prev) => [...prev, makeDiagnosticDraft()])}
              className="w-full rounded-lg border border-cyan-500/50 bg-cyan-500/10 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20"
            >
              + Add Diagnostic
            </button>
            <button
              type="button"
              onClick={requestLab}
              disabled={sendingLab || !diagnosticItems.some((item) => item.testName.trim())}
              className="w-full py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 text-sm font-medium hover:bg-cyan-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FlaskConical className="h-4 w-4" />
              {sendingLab ? 'Sending...' : 'Request Diagnostic'}
            </button>
            <p className="text-[10px] text-slate-500">Notifies Lab, X-ray, Sonar, or ECG.</p>
          </section>

          {/* Group 2: Pharmacy Orders */}
          <section className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
            <h4 className="text-sm font-semibold text-amber-200">Pharmacy Orders</h4>
            {medicationItems.map((row, idx) => (
              <div key={row.id} className="rounded-lg border border-slate-700/70 bg-slate-900/40 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-300">Medication {idx + 1}</p>
                  {medicationItems.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => setMedicationItems((prev) => prev.filter((item) => item.id !== row.id))}
                      className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-300 hover:bg-rose-500/20"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <input
                  value={row.drugName}
                  onChange={(e) =>
                    setMedicationItems((prev) =>
                      prev.map((item) => (item.id === row.id ? { ...item, drugName: e.target.value } : item))
                    )
                  }
                  placeholder="Drug name"
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm"
                />
                <div className="grid grid-cols-4 gap-2">
                  <input
                    value={row.dose}
                    onChange={(e) =>
                      setMedicationItems((prev) =>
                        prev.map((item) => (item.id === row.id ? { ...item, dose: e.target.value } : item))
                      )
                    }
                    placeholder="Dose"
                    className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm"
                  />
                  <input
                    value={row.frequency}
                    onChange={(e) =>
                      setMedicationItems((prev) =>
                        prev.map((item) => (item.id === row.id ? { ...item, frequency: e.target.value } : item))
                      )
                    }
                    placeholder="Frequency"
                    className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm"
                  />
                  <input
                    value={row.duration}
                    onChange={(e) =>
                      setMedicationItems((prev) =>
                        prev.map((item) => (item.id === row.id ? { ...item, duration: e.target.value } : item))
                      )
                    }
                    placeholder="Duration"
                    className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm"
                  />
                  <input
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) =>
                      setMedicationItems((prev) =>
                        prev.map((item) =>
                          item.id === row.id
                            ? { ...item, quantity: Math.max(1, Number(e.target.value) || 1) }
                            : item
                        )
                      )
                    }
                    placeholder="Qty"
                    className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              disabled={sendingPharmacy}
              onClick={() => setMedicationItems((prev) => [...prev, makeMedicationDraft()])}
              className="w-full rounded-lg border border-amber-500/50 bg-amber-500/10 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/20"
            >
              + Add Medication
            </button>
            <div className="space-y-1">
              <button
                type="button"
                onClick={sendToPharmacy}
                disabled={sendingPharmacy || !medicationItems.some((item) => item.drugName.trim())}
                className="w-full py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 text-sm font-medium hover:bg-amber-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Pill className="h-4 w-4" />
                {sendingPharmacy ? 'Sending...' : 'Send to Pharmacy'}
              </button>
              <p className="text-[10px] text-slate-500">Sends meds to Pharmacy &amp; Finance.</p>
            </div>
            <button
              type="button"
              onClick={saveOrders}
              disabled={saving}
              className="w-full py-2 rounded-lg bg-slate-600 text-slate-200 text-sm font-medium hover:bg-slate-500 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Orders'}
            </button>
            {patient.pharmacyOrderStatus && (
              <div className="rounded-lg border border-slate-700/60 bg-slate-800/30 px-3 py-2">
                <p className="text-[10px] text-slate-400">Order status</p>
                <p className="text-sm font-medium text-slate-200">
                  {patient.medicineReady ? '✓ Dispensed' : patient.pharmacyOutOfStock ? '⚠️ Out of Stock' : 'Pending'}
                </p>
              </div>
            )}
          </section>

          <section className="space-y-2">

            {/* Pending diagnostic requests — Remove so it disappears from Lab/Nurse */}
            {patient.erOrders?.filter((o) =>
              ['LAB', 'LAB_REQUESTED', 'RADIOLOGY_REQUESTED', 'SONAR_REQUESTED', 'ECG_REQUESTED'].includes(o.type)
            ).length ? (
              <div className="rounded-lg border border-slate-700/60 bg-slate-800/30 p-2 space-y-1.5">
                <p className="text-[10px] text-slate-400 font-medium">Pending requests (remove to cancel)</p>
                {patient.erOrders
                  .filter((o) =>
                    ['LAB', 'LAB_REQUESTED', 'RADIOLOGY_REQUESTED', 'SONAR_REQUESTED', 'ECG_REQUESTED'].includes(o.type)
                  )
                  .map((o) => (
                    <div key={o.at} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-300 truncate">
                        {o.type === 'RADIOLOGY_REQUESTED'
                          ? '🩻'
                          : o.type === 'SONAR_REQUESTED'
                            ? '📡'
                            : o.type === 'ECG_REQUESTED'
                              ? '📈'
                              : '🧪'}{' '}
                        {o.content || o.type}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/emergency/doctor/order-remove', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ visitId: patient.visitId, at: o.at }),
                            })
                            if (res.ok) {
                              showToast('Request removed. Lab/Nurse view will update.', 'success')
                              onSaved()
                            }
                          } catch (_) {
                            setError('Failed to remove request')
                          }
                        }}
                        className="text-rose-400 hover:text-rose-300 shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handlePrintSummary}
              className="w-full py-2 rounded-lg bg-slate-600/50 border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-600 flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Print Summary
            </button>
            <p className="text-[10px] text-slate-500">Medical report (Lab, X-Ray, notes) for patient before billing.</p>

            <button
              type="button"
              onClick={readyForDischarge}
              disabled={discharging || patient.hasPendingDiagnostics || patient.billingStatus === 'waiting_for_payment'}
              title={patient.hasPendingDiagnostics ? 'Complete or remove pending Lab / X-Ray / Sonar / ECG requests first' : patient.billingStatus === 'waiting_for_payment' ? 'Already in Pending Payment' : undefined}
              className="w-full py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-sm font-medium hover:bg-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              {discharging ? 'Sending...' : patient.billingStatus === 'waiting_for_payment' ? 'In Pending Payment' : 'Ready for Discharge'}
            </button>
            {patient.hasPendingDiagnostics ? (
              <div className="space-y-1">
                <p className="text-[10px] text-amber-400">Pending Lab / X-Ray / Sonar / ECG — complete or remove requests first.</p>
                {hasPendingLabResults ? (
                  <p className="text-[10px] font-semibold text-rose-300">
                    Lab safety warning: pending lab results must be reviewed before discharge.
                  </p>
                ) : null}
              </div>
            ) : patient.billingStatus === 'waiting_for_payment' ? (
              <p className="text-[10px] text-emerald-400">Patient is in Accountant Pending list. Pay there to free the bed.</p>
            ) : (
              <p className="text-[10px] text-slate-500">Adds patient to Accountant Pending Payment. Bed clears after payment.</p>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
