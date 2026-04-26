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

const TOTAL_BEDS = 12

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
      const nextList =
        typeof window !== 'undefined' && isDiagnosticUiSimEnabled()
          ? [...getDiagnosticSimErPatients(), ...apiList]
          : apiList
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
    const id = window.setInterval(() => void fetchErPatients(), 10000)
    return () => window.clearInterval(id)
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
  heading,
  subheading,
  patientFilter,
}: {
  patients: ERPatient[]
  loading: boolean
  error: string | null
  fetchPatients: () => void | Promise<void>
  heading?: string
  subheading?: string
  patientFilter?: (p: ERPatient) => boolean
}) {
  const { user } = useAuth()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'alert' } | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedBedNumber, setSelectedBedNumber] = useState<number | null>(null)
  const [resultCard, setResultCard] = useState<{ type: ResultCardType; patient: ERPatient } | null>(null)
  const [requestModal, setRequestModal] = useState<{
    visitId: string
    patientId: string
    patientName: string
    bedNumber: number
    department: 'Lab' | 'Radiology' | 'Sonar' | 'ECG'
  } | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const prevUnreviewedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const prev = prevUnreviewedRef.current
    const next = new Set<string>()
    patients.forEach((p) => {
      const bed = p.bedNumber ?? 0
      if (p.labUnreviewed) next.add(`Bed ${bed} - Lab`)
      if (p.radiologyUnreviewed) next.add(`Bed ${bed} - X-Ray`)
      if (p.sonarUnreviewed) next.add(`Bed ${bed} - Sonar`)
      if (p.ecgUnreviewed) next.add(`Bed ${bed} - ECG`)
    })
    const newKeys = Array.from(next).filter((k) => !prev.has(k))
    if (newKeys.length > 0) {
      const message =
        newKeys.length === 1
          ? `New Result: ${newKeys[0]} Ready`
          : `New Results: ${newKeys.slice(0, 3).join('; ')}${newKeys.length > 3 ? ` +${newKeys.length - 3} more` : ''}`
      setToast({ message, type: 'success' })
      setTimeout(() => setToast(null), 5000)
    }
    prevUnreviewedRef.current = next
  }, [patients])

  const showToast = (message: string, type: 'success' | 'alert') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

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

  const openResultModal = (type: ResultCardType, patient: ERPatient) => {
    if (type === 'Lab' && !(patient.labReady && patient.labDiagnostic)) return
    if (type === 'Radiology' && !(patient.radiologyReady && patient.radiologyDiagnostic)) return
    if (type === 'Sonar' && !(patient.sonarReady && patient.sonarDiagnostic)) return
    if (type === 'ECG' && !(patient.ecgReady && patient.ecgDiagnostic)) return
    void markResultReviewed(patient.visitId, type)
    setResultCard({ type, patient })
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <LayoutGrid className="h-7 w-7 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{heading ?? 'ER Doctor Clinic'}</h1>
            <p className="text-sm text-slate-400">
              {subheading ?? 'Vitals from Vitals Station; diagnostics and tasks — click a bed'}
            </p>
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed top-6 right-6 z-[100] px-5 py-3 rounded-xl border shadow-lg ${
            toast.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
              : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
          }`}
        >
          {toast.message}
        </div>
      )}

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
                  onOpenDrawer={openDrawer}
                  onQuickRequest={(e, p, department) => {
                    e.stopPropagation()
                    setRequestModal({
                      visitId: p.visitId,
                      patientId: p.patientId,
                      patientName: p.name,
                      bedNumber: p.bedNumber ?? bedNum,
                      department,
                    })
                  }}
                  onResultClick={(e, type, p) => {
                    e.stopPropagation()
                    openResultModal(type, p)
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
            <div className="w-full max-w-md overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
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
              <div className="space-y-3 p-4">
                <p className="text-sm text-slate-400">
                  Bed {resultCard.patient.bedNumber} — {resultCard.patient.name}
                </p>
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                  <p className="mb-1 text-sm font-medium text-slate-300">Summary</p>
                  <pre className="whitespace-pre-wrap text-sm text-slate-200">
                    {(resultCard.type === 'Lab'
                      ? resultCard.patient.labDiagnostic
                      : resultCard.type === 'Radiology'
                        ? resultCard.patient.radiologyDiagnostic
                        : resultCard.type === 'Sonar'
                          ? resultCard.patient.sonarDiagnostic
                          : resultCard.patient.ecgDiagnostic
                    )?.summary || '—'}
                  </pre>
                </div>
                {resultCard.type !== 'Lab' &&
                  (resultCard.type === 'Radiology'
                    ? resultCard.patient.radiologyDiagnostic?.technicianNotes
                    : resultCard.type === 'Sonar'
                      ? resultCard.patient.sonarDiagnostic?.technicianNotes
                      : resultCard.patient.ecgDiagnostic?.technicianNotes) && (
                    <div className="rounded-lg border border-sky-500/25 bg-slate-800/50 p-3">
                      <p className="mb-1 text-sm font-medium text-sky-300">Technician notes</p>
                      <pre className="whitespace-pre-wrap text-sm text-slate-200">
                        {resultCard.type === 'Radiology'
                          ? resultCard.patient.radiologyDiagnostic?.technicianNotes
                          : resultCard.type === 'Sonar'
                            ? resultCard.patient.sonarDiagnostic?.technicianNotes
                            : resultCard.patient.ecgDiagnostic?.technicianNotes}
                      </pre>
                    </div>
                  )}
                {(resultCard.type === 'Lab'
                  ? resultCard.patient.labDiagnostic
                  : resultCard.type === 'Radiology'
                    ? resultCard.patient.radiologyDiagnostic
                    : resultCard.type === 'Sonar'
                      ? resultCard.patient.sonarDiagnostic
                      : resultCard.patient.ecgDiagnostic
                )?.attachmentPath && (
                  <a
                    href={
                      (resultCard.type === 'Lab'
                        ? resultCard.patient.labDiagnostic
                        : resultCard.type === 'Radiology'
                          ? resultCard.patient.radiologyDiagnostic
                          : resultCard.type === 'Sonar'
                            ? resultCard.patient.sonarDiagnostic
                            : resultCard.patient.ecgDiagnostic)!.attachmentPath
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-500/30"
                  >
                    {resultCard.type === 'Lab' ? 'View Attachment' : 'View Original Image/Report'}
                  </a>
                )}
              </div>
            </div>
          </div>
        </>
      )}

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
type ActivityEntry = {
  id: string
  action: string
  details?: string | null
  actorName?: string | null
  createdAt: string
}

function ERDoctorDrawer({ patient, doctorId, onClose, onSaved, showToast, setError }: ERDoctorDrawerProps) {
  const [medications, setMedications] = useState(patient.doctorMedications ?? '')
  const [labTests, setLabTests] = useState(patient.doctorLabTests ?? '')
  const [diagnosticDept, setDiagnosticDept] = useState<DiagnosticDept>('Lab')
  const [saving, setSaving] = useState(false)
  const [sendingPharmacy, setSendingPharmacy] = useState(false)
  const [sendingLab, setSendingLab] = useState(false)
  const [discharging, setDischarging] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [taskPreset, setTaskPreset] = useState('Injection')
  const [taskDetail, setTaskDetail] = useState('')
  const [assignSending, setAssignSending] = useState(false)
  const [activityHistory, setActivityHistory] = useState<ActivityEntry[]>([])

  useEffect(() => {
    setMedications(patient.doctorMedications ?? '')
    setLabTests(patient.doctorLabTests ?? '')
  }, [patient.visitId])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch(`/api/emergency/activity?visitId=${encodeURIComponent(patient.visitId)}`)
        if (!res.ok) return
        const data = (await res.json()) as ActivityEntry[]
        if (mounted) setActivityHistory(Array.isArray(data) ? data : [])
      } catch (_) {}
    }
    void load()
    const id = window.setInterval(() => void load(), 10000)
    return () => {
      mounted = false
      window.clearInterval(id)
    }
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
          medications: medications.trim() || undefined,
          labTests: labTests.trim() || undefined,
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
    const medText = medications.trim()
    if (!medText) {
      setError('Enter medications first.')
      return
    }
    setError(null)
    setSendingPharmacy(true)
    try {
      const prescriptionItems = medText.split('\n').filter((l) => l.trim()).map((line) => {
        const parts = line.split(' - ')
        const medicinePart = parts[0] || line
        const frequency = parts[1] || 'As prescribed'
        const match = medicinePart.match(/^(.+?)\s+(\d+.*?)$/)
        return {
          medicineName: match ? match[1].trim() : medicinePart.trim(),
          dosage: match ? match[2].trim() : 'As prescribed',
          frequency: frequency.trim(),
        }
      })
      const res = await fetch('/api/doctor/visit/send-to-pharmacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: patient.visitId,
          patientId: patient.patientId,
          doctorId,
          prescriptionItems,
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
      setMedications('')
      onSaved()
    } catch (e: unknown) {
      const err = e as Error
      setError(err?.message || 'Failed to send to pharmacy')
    } finally {
      setSendingPharmacy(false)
    }
  }

  const requestLab = async () => {
    const content = labTests.trim()
    if (!content) {
      setError('Enter tests / impression first.')
      return
    }
    setError(null)
    setSendingLab(true)
    try {
      const res = await fetch('/api/emergency/doctor/lab-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: patient.visitId, content, department: diagnosticDept }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to request')
      }
      const deptLabel =
        diagnosticDept === 'Lab'
          ? 'Lab'
          : diagnosticDept === 'Radiology'
            ? 'X-Ray'
            : diagnosticDept === 'Sonar'
              ? 'Sonar'
              : 'ECG'
      showToast(`${deptLabel} request sent.`, 'success')
      setLabTests('')
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
    const detail = taskDetail.trim()
    if (!detail) {
      setError('Enter task instructions for the nurse.')
      return
    }
    setAssignSending(true)
    setError(null)
    try {
      const res = await fetch('/api/emergency/doctor/append-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: patient.visitId,
          type: 'NURSE_TASK',
          content: `${taskPreset}: ${detail}`,
          assigneeUserId: 'POOL',
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as { error?: string }).error || 'Failed to assign task')
      }
      showToast('Task sent to floor nurses.', 'success')
      setAssignOpen(false)
      setTaskDetail('')
      onSaved()
    } catch (e: unknown) {
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
              <p className="mt-1 text-xs text-slate-500">General ER nurse pool</p>
              <label className="mt-4 block text-xs text-slate-400">Type</label>
              <select
                value={taskPreset}
                onChange={(e) => setTaskPreset(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              >
                <option value="Injection">Injection</option>
                <option value="IV">IV / fluids</option>
                <option value="Dressing">Dressing / wound care</option>
                <option value="Other">Other</option>
              </select>
              <label className="mt-3 block text-xs text-slate-400">Instructions</label>
              <textarea
                value={taskDetail}
                onChange={(e) => setTaskDetail(e.target.value)}
                rows={3}
                placeholder="e.g. Ceftriaxone 1g IM left deltoid"
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
              />
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
                  disabled={assignSending || !taskDetail.trim()}
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
              onClick={() => setAssignOpen(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-violet-400/70 bg-violet-500/30 py-3.5 text-base font-bold text-violet-100 shadow-[0_0_24px_rgba(168,85,247,0.22)] hover:bg-violet-500/40"
            >
              <ListTodo className="h-5 w-5" />
              Assign Task
            </button>
            <p className="mt-2 text-[10px] text-slate-500">
              Floor nurses receive this task. Completion shows a green check on this bed card.
            </p>
          </section>

          <section className="space-y-2 rounded-xl border border-slate-700/60 bg-slate-800/20 p-3">
            <h4 className="text-sm font-semibold text-slate-200">Bed Activity History</h4>
            {activityHistory.length === 0 ? (
              <p className="text-xs text-slate-500">No activity recorded yet.</p>
            ) : (
              <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {activityHistory.map((entry) => {
                  const at = new Date(entry.createdAt)
                  const time = Number.isNaN(at.getTime())
                    ? '—'
                    : at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  const by = entry.actorName ? ` by ${entry.actorName}` : ''
                  return (
                    <div key={entry.id} className="rounded-md border border-slate-700/60 bg-slate-900/40 px-2 py-1.5 text-xs">
                      <p className="text-slate-200">
                        <span className="font-semibold text-cyan-300">{time}</span> - {entry.action}
                        {by}
                      </p>
                      {entry.details ? <p className="mt-0.5 text-[10px] text-slate-500">{entry.details}</p> : null}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Group 1: Diagnostics */}
          <section className="space-y-3 rounded-xl border border-slate-700/70 bg-slate-800/25 p-3">
            <h4 className="text-sm font-semibold text-cyan-200">Diagnostics</h4>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: 'Lab', label: 'Lab' },
                { key: 'Radiology', label: 'X-Ray' },
                { key: 'Sonar', label: 'Sonar' },
                { key: 'ECG', label: 'ECG' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setDiagnosticDept(opt.key as DiagnosticDept)}
                  className={`rounded-lg border px-2 py-2 text-sm font-semibold transition ${
                    diagnosticDept === opt.key
                      ? 'border-cyan-500/60 bg-cyan-500/20 text-cyan-200'
                      : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Diagnostic Details</label>
              <textarea
                value={labTests}
                onChange={(e) => setLabTests(e.target.value)}
                placeholder="e.g. CBC, X-Ray Chest"
                rows={2}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={requestLab}
              disabled={sendingLab || !labTests.trim()}
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
            <div>
              <label className="block text-xs text-slate-400 mb-1">Medication List (for Pharmacy)</label>
              <textarea
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
                placeholder="e.g. Paracetamol 500mg TDS"
                rows={3}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm"
              />
            </div>
            <div className="space-y-1">
              <button
                type="button"
                onClick={sendToPharmacy}
                disabled={sendingPharmacy || !medications.trim()}
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
              <p className="text-[10px] text-amber-400">Pending Lab / X-Ray / Sonar / ECG — complete or remove requests first.</p>
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
