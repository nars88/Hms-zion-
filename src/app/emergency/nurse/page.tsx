'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import {
  Activity,
  AlertCircle,
  BedDouble,
  UserPlus,
  Zap,
  Pill,
  Receipt,
  X,
  Stethoscope,
  ClipboardList,
  FlaskConical,
  FileText,
} from 'lucide-react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import BackButton from '@/components/BackButton'
import { useAuth, USER_ROLES } from '@/contexts/AuthContext'
import type { ERPatient, ERTask, ResultCardType, Severity } from '@/types/er'

const TOTAL_BEDS = 12

const SEVERITY_LEVEL: { value: Severity; label: string; triageLevel: number }[] = [
  { value: 'Red', label: 'Red – Critical', triageLevel: 1 },
  { value: 'Yellow', label: 'Yellow – Stable', triageLevel: 2 },
  { value: 'Green', label: 'Green – Minor', triageLevel: 3 },
]

export default function ERNursePage() {
  return (
    <ProtectedRoute
      allowedRoles={[USER_ROLES.ER_NURSE, USER_ROLES.ADMIN]}
      redirectTo="/"
    >
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-auto p-6">
            <ERNurseBedDashboard />
          </main>
        </div>
      </div>
      <BackButton />
    </ProtectedRoute>
  )
}

function ERNurseBedDashboard() {
  const [patients, setPatients] = useState<ERPatient[]>([])
  const [tasks, setTasks] = useState<ERTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'alert' } | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedBedNumber, setSelectedBedNumber] = useState<number | null>(null)
  const [resultCard, setResultCard] = useState<{ type: ResultCardType; patient: ERPatient } | null>(null)
  const prevUnreviewedRef = useRef<Set<string>>(new Set())

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/emergency/tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(Array.isArray(data) ? data : [])
      }
    } catch (_) {}
  }

  const fetchPatients = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/emergency/patients')
      if (!res.ok) throw new Error('Failed to load ER patients')
      const data = await res.json()
      const prev = prevUnreviewedRef.current
      const next = new Set<string>()
      data.forEach((p: ERPatient) => {
        const bed = p.bedNumber ?? 0
        if (p.labUnreviewed) next.add(`Bed ${bed} - Lab`)
        if (p.radiologyUnreviewed) next.add(`Bed ${bed} - X-Ray`)
        if (p.sonarUnreviewed) next.add(`Bed ${bed} - Sonar`)
      })
      const newKeys = Array.from(next).filter((k) => !prev.has(k))
      if (newKeys.length > 0) {
        const message = newKeys.length === 1
          ? `New Result: ${newKeys[0]} Ready`
          : `New Results: ${newKeys.slice(0, 3).join('; ')}${newKeys.length > 3 ? ` +${newKeys.length - 3} more` : ''}`
        setToast({ message, type: 'success' })
        setTimeout(() => setToast(null), 5000)
      }
      prevUnreviewedRef.current = next
      setPatients(data)
    } catch (e: any) {
      setError(e?.message || 'Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatients()
    const interval = setInterval(fetchPatients, 12000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchTasks()
    const interval = setInterval(fetchTasks, 5000)
    return () => clearInterval(interval)
  }, [])

  const showToast = (message: string, type: 'success' | 'alert') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const bedMap = new Map<number, ERPatient>()
  patients.forEach((p) => {
    if (p.bedNumber != null) bedMap.set(p.bedNumber, p)
  })

  const openDrawer = (bedNum: number) => {
    setSelectedBedNumber(bedNum)
    setDrawerOpen(true)
  }

  const closeDrawer = () => {
    setDrawerOpen(false)
    setSelectedBedNumber(null)
  }

  const markResultReviewed = async (visitId: string, type: ResultCardType) => {
    try {
      await fetch('/api/emergency/doctor/result-reviewed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId, department: type }),
      })
      fetchPatients()
    } catch (_) {}
  }

  const openResultModal = (type: ResultCardType, patient: ERPatient) => {
    if (type === 'Lab' && !(patient.labReady && patient.labDiagnostic)) return
    if (type === 'Radiology' && !(patient.radiologyReady && patient.radiologyDiagnostic)) return
    if (type === 'Sonar' && !(patient.sonarReady && patient.sonarDiagnostic)) return
    markResultReviewed(patient.visitId, type)
    setResultCard({ type, patient })
  }

  const refreshAll = () => {
    fetchPatients()
    fetchTasks()
  }

  const handleCodeBlue = () => {
    showToast('Code Blue activated – emergency team alerted!', 'alert')
  }

  const handleSummonDoctors = () => {
    showToast('Doctors alerted!', 'alert')
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header + Fast-actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
            <BedDouble className="h-7 w-7 text-rose-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">ER Bed Management</h1>
            <p className="text-sm text-slate-400">Assign beds, vitals, and actions</p>
            <p className="text-xs text-slate-500 mt-1">Click any bed card to open vitals, request medication (Pharmacy), or discharge (Finance).</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCodeBlue}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/20 border border-red-500/50 text-red-300 font-semibold hover:bg-red-500/30 transition-colors"
          >
            <AlertCircle className="h-5 w-5" />
            Code Blue
          </button>
          <button
            type="button"
            onClick={handleSummonDoctors}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-semibold hover:bg-amber-500/30 transition-colors"
          >
            <Zap className="h-5 w-5" />
            Summon Doctors
          </button>
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

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-400">
          {error}
        </div>
      )}

      {/* Tasks from Doctor (real-time sync) */}
      <section className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
        <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-cyan-400" />
          Tasks from Doctor
        </h2>
        <p className="text-xs text-slate-500 mb-2">Orders and actions from ER Doctor (updates every 5s).</p>
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-500">No tasks yet.</p>
        ) : (
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {tasks.slice(0, 20).map((t, i) => {
              const isDone = t.status === 'DONE'
              return (
                <li
                  key={`${t.visitId}-${t.at}-${i}`}
                  className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 border ${
                    isDone ? 'bg-slate-800/30 border-slate-700/30 opacity-75' : 'bg-slate-800/50 border-slate-700/50'
                  }`}
                >
                  <span className="font-medium text-cyan-300 shrink-0">
                    Bed {t.bedNumber ?? '?'} · {t.patientName}
                  </span>
                  <span className="text-slate-400">{t.type}</span>
                  {t.content && <span className="text-slate-300 truncate">{t.content}</span>}
                  {!isDone && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/emergency/tasks/mark-done', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ visitId: t.visitId, at: t.at }),
                          })
                          if (res.ok) {
                            showToast('Task marked done.', 'success')
                            fetchTasks()
                          }
                        } catch (_) {}
                      }}
                      className="ml-auto shrink-0 text-xs font-medium text-emerald-400 hover:text-emerald-300 border border-emerald-500/40 rounded px-2 py-1"
                    >
                      Mark done
                    </button>
                  )}
                  {isDone && <span className="ml-auto text-xs text-emerald-500">Done</span>}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Bed grid */}
      <section>
        <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Bed Status
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {Array.from({ length: TOTAL_BEDS }, (_, i) => (
              <div
                key={i}
                className="h-36 rounded-xl border border-slate-800/60 bg-slate-900/40 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {Array.from({ length: TOTAL_BEDS }, (_, i) => {
              const bedNum = i + 1
              const patient = bedMap.get(bedNum)
              const isAvailable = !patient
              const severity: Severity =
                patient?.triageLevel === 1 ? 'Red' : patient?.triageLevel === 2 ? 'Yellow' : 'Green'

              return (
                <button
                  key={bedNum}
                  type="button"
                  onClick={() => openDrawer(bedNum)}
                  className={`text-left rounded-xl border transition-all duration-200 overflow-hidden min-h-[140px] flex flex-col ${
                    isAvailable
                      ? 'bg-emerald-500/10 border-emerald-500/40 hover:bg-emerald-500/15 hover:border-emerald-500/50'
                      : severity === 'Red'
                      ? 'bg-red-500/15 border-red-500/40 hover:bg-red-500/20'
                      : severity === 'Yellow'
                      ? 'bg-amber-500/15 border-amber-500/40 hover:bg-amber-500/20'
                      : 'bg-emerald-500/15 border-emerald-500/40 hover:bg-emerald-500/20'
                  }`}
                >
                  <div className="p-3 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-400">
                        Bed {bedNum}
                      </span>
                      {!isAvailable && (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${
                            severity === 'Red'
                              ? 'bg-red-500/30 text-red-200'
                              : severity === 'Yellow'
                              ? 'bg-amber-500/30 text-amber-200'
                              : 'bg-emerald-500/30 text-emerald-200'
                          }`}
                        >
                          {severity}
                        </span>
                      )}
                    </div>
                    {isAvailable ? (
                      <>
                        <span className="text-sm font-medium text-emerald-300">Available</span>
                        <span className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-400/90">
                          <UserPlus className="h-3.5 w-3.5" />
                          New Admission
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-slate-100 truncate">
                          {patient!.name}
                        </span>
                        <span className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {patient!.chiefComplaint || '—'}
                        </span>
                        <span className="mt-2 flex items-center gap-2 text-[10px] flex-wrap">
                          <span className="inline-flex items-center gap-1 text-slate-500"><Stethoscope className="h-3 w-3" /> Vitals</span>
                          <span className="inline-flex items-center gap-1 text-slate-500"><Pill className="h-3 w-3" /> Pharmacy</span>
                          <span className="inline-flex items-center gap-1 text-slate-500"><Receipt className="h-3 w-3" /> Finance</span>
                          <span
                            title={patient!.labReady ? (patient!.labUnreviewed ? 'New result – click to review' : 'Lab result') : 'Lab'}
                            onClick={(e) => { e.stopPropagation(); openResultModal('Lab', patient!) }}
                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 transition-all ${
                              patient!.labReady
                                ? `cursor-pointer text-emerald-400 hover:bg-emerald-500/20 ${patient!.labUnreviewed ? 'animate-pulse bg-emerald-500/20' : ''}`
                                : 'text-slate-500 cursor-default'
                            }`}
                          >
                            🧪 {patient!.labReady ? (patient!.labUnreviewed ? 'New' : 'Ready') : 'Lab'}
                          </span>
                          <span
                            title={patient!.radiologyReady ? (patient!.radiologyUnreviewed ? 'New result – click to review' : 'X-Ray result') : 'X-Ray'}
                            onClick={(e) => { e.stopPropagation(); openResultModal('Radiology', patient!) }}
                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 transition-all ${
                              patient!.radiologyReady
                                ? `cursor-pointer text-emerald-400 hover:bg-emerald-500/20 ${patient!.radiologyUnreviewed ? 'animate-pulse bg-emerald-500/20' : ''}`
                                : 'text-slate-500 cursor-default'
                            }`}
                          >
                            🩻 {patient!.radiologyReady ? (patient!.radiologyUnreviewed ? 'New' : 'Ready') : 'X-Ray'}
                          </span>
                          <span
                            title={patient!.sonarReady ? (patient!.sonarUnreviewed ? 'New result – click to review' : 'Sonar result') : 'Sonar'}
                            onClick={(e) => { e.stopPropagation(); openResultModal('Sonar', patient!) }}
                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 transition-all ${
                              patient!.sonarReady
                                ? `cursor-pointer text-emerald-400 hover:bg-emerald-500/20 ${patient!.sonarUnreviewed ? 'animate-pulse bg-emerald-500/20' : ''}`
                                : 'text-slate-500 cursor-default'
                            }`}
                          >
                            📡 {patient!.sonarReady ? (patient!.sonarUnreviewed ? 'New' : 'Ready') : 'Sonar'}
                          </span>
                          {patient!.billingStatus === 'waiting_for_payment' && (
                            <span className="inline-flex items-center gap-0.5 text-amber-400" title="Waiting for payment">
                              ⏳ Waiting for Payment
                            </span>
                          )}
                          {patient!.billingStatus === 'paid' && (
                            <span className="inline-flex items-center gap-0.5 text-emerald-400" title="Paid - bed will clear">
                              ✅ Paid – Clear Bed
                            </span>
                          )}
                          {patient!.medicineReady && (
                            <span className="inline-flex items-center gap-0.5 text-emerald-400" title="Medicine ready">
                              💊 Medicine Ready
                            </span>
                          )}
                          {patient!.pharmacyOutOfStock && (
                            <span className="inline-flex items-center gap-0.5 text-rose-400" title="Out of stock">
                              ⚠️ Out of Stock
                            </span>
                          )}
                        </span>
                      </>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Side drawer */}
      {drawerOpen && selectedBedNumber !== null && (
        <BedDrawer
          bedNumber={selectedBedNumber}
          patient={bedMap.get(selectedBedNumber) ?? null}
          onClose={closeDrawer}
          onSaved={refreshAll}
          showToast={showToast}
          setError={setError}
        />
      )}

      {/* Result Card modal — when clicking green Lab/X-Ray/Sonar icon */}
      {resultCard && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" aria-hidden onClick={() => setResultCard(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-slate-100">
                  {resultCard.type === 'Lab' ? '🧪 Lab' : resultCard.type === 'Radiology' ? '🩻 X-Ray' : '📡 Sonar'} Result
                </h3>
                <button type="button" onClick={() => setResultCard(null)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm text-slate-400">Bed {resultCard.patient.bedNumber} — {resultCard.patient.name}</p>
                <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-3">
                  <p className="text-sm font-medium text-slate-300 mb-1">Summary</p>
                  <pre className="text-sm text-slate-200 whitespace-pre-wrap">
                    {(resultCard.type === 'Lab' ? resultCard.patient.labDiagnostic : resultCard.type === 'Radiology' ? resultCard.patient.radiologyDiagnostic : resultCard.patient.sonarDiagnostic)?.summary || '—'}
                  </pre>
                </div>
                {((resultCard.type === 'Lab' ? resultCard.patient.labDiagnostic : resultCard.type === 'Radiology' ? resultCard.patient.radiologyDiagnostic : resultCard.patient.sonarDiagnostic)?.attachmentPath) && (
                  <a
                    href={(resultCard.type === 'Lab' ? resultCard.patient.labDiagnostic : resultCard.type === 'Radiology' ? resultCard.patient.radiologyDiagnostic : resultCard.patient.sonarDiagnostic)!.attachmentPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-sm font-medium hover:bg-cyan-500/30"
                  >
                    View Attachment
                  </a>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface BedDrawerProps {
  bedNumber: number
  patient: ERPatient | null
  onClose: () => void
  onSaved: () => void
  showToast: (message: string, type: 'success' | 'alert') => void
  setError: (e: string | null) => void
}

function BedDrawer({ bedNumber, patient, onClose, onSaved, showToast, setError }: BedDrawerProps) {
  const isAvailable = !patient

  // New admission form state
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male')
  const [severity, setSeverity] = useState<Severity>('Yellow')
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Vitals state (when occupied)
  const [bp, setBp] = useState(patient?.vitals?.bp ?? '')
  const [hr, setHr] = useState(patient?.vitals?.heartRate != null ? String(patient.vitals.heartRate) : '')
  const [spo2, setSpo2] = useState('')
  const [temp, setTemp] = useState(patient?.vitals?.temperature != null ? String(patient.vitals.temperature) : '')
  const [weight, setWeight] = useState(patient?.vitals?.weight != null ? String(patient.vitals.weight) : '')
  const [savingVitals, setSavingVitals] = useState(false)

  useEffect(() => {
    if (patient?.vitals) {
      setBp(patient.vitals.bp ?? '')
      setHr(String(patient.vitals.heartRate ?? ''))
      setTemp(String(patient.vitals.temperature ?? ''))
      setWeight(String(patient.vitals.weight ?? ''))
    }
  }, [patient])

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fullName = name.trim()
    const ageNum = parseInt(age, 10)
    if (!fullName || !age || isNaN(ageNum) || ageNum <= 0) {
      setError('Name and a valid age are required.')
      return
    }
    if (!chiefComplaint.trim()) {
      setError('Chief complaint is required.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const phone = `ER-${Date.now()}`
      const regRes = await fetch('/api/intake/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          age: ageNum,
          phone,
          gender,
          department: 'ER',
        }),
      })
      if (!regRes.ok) {
        const err = await regRes.json().catch(() => ({}))
        throw new Error(err?.error || 'Registration failed')
      }
      const { patient: p, visit } = await regRes.json()
      const patientName = `${p?.firstName ?? ''} ${p?.lastName ?? ''}`.trim() || fullName
      const visitId = visit?.id
      const patientId = p?.id
      if (!visitId || !patientId) throw new Error('Missing visit or patient id')

      await fetch('/api/er/create-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId, patientId, patientName }),
      })

      await fetch(`/api/visits/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chiefComplaint: chiefComplaint.trim(),
          bedNumber,
        }),
      })

      const severityConfig = SEVERITY_LEVEL.find((s) => s.value === severity)
      const triageLevel = severityConfig?.triageLevel ?? 2
      await fetch(`/api/patients/${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triageLevel }),
      })

      showToast(`Patient admitted to Bed ${bedNumber}. Entry fee sent to Accountant.`, 'success')
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e?.message || 'Admission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patient) return
    const bpVal = bp.trim()
    const tempVal = parseFloat(temp)
    const hrVal = parseInt(hr, 10)
    const weightVal = parseFloat(weight)
    if (!bpVal || !Number.isFinite(tempVal) || !Number.isFinite(hrVal) || !Number.isFinite(weightVal)) {
      setError('BP, HR, Temperature, and Weight are required.')
      return
    }
    setError(null)
    setSavingVitals(true)
    try {
      const triageLevel = patient.triageLevel ?? 2
      const res = await fetch('/api/intake/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.patientId,
          visitId: patient.visitId,
          bp: bpVal,
          temperature: tempVal,
          heartRate: hrVal,
          weight: weightVal,
          allergies: 'None',
          triageLevel,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || 'Failed to save vitals')
      }
      showToast('Vitals saved.', 'success')
      onSaved()
    } catch (e: any) {
      setError(e?.message || 'Failed to save vitals')
    } finally {
      setSavingVitals(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-700/80 shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700/80 flex-shrink-0">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-cyan-400" />
            Bed {bedNumber}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {isAvailable ? (
            <>
              <p className="text-sm text-slate-400">Assign a new admission to this bed.</p>
              <form onSubmit={handleAdmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full name"
                    className="w-full h-10 rounded-lg bg-slate-800 border border-slate-700 px-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Age</label>
                    <input
                      type="number"
                      min={1}
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Age"
                      className="w-full h-10 rounded-lg bg-slate-800 border border-slate-700 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')}
                      className="w-full h-10 rounded-lg bg-slate-800 border border-slate-700 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as Severity)}
                    className="w-full h-10 rounded-lg bg-slate-800 border border-slate-700 px-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  >
                    {SEVERITY_LEVEL.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Chief Complaint</label>
                  <input
                    type="text"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    placeholder="What's wrong?"
                    className="w-full h-10 rounded-lg bg-slate-800 border border-slate-700 px-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 rounded-lg bg-cyan-500 text-slate-900 font-semibold hover:bg-cyan-400 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Admitting...' : 'Admit to Bed ' + bedNumber}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="rounded-lg bg-slate-800/50 border border-slate-700/60 p-3">
                <p className="text-sm font-semibold text-slate-100">{patient!.name}</p>
                <p className="text-xs text-slate-400 mt-1">{patient!.chiefComplaint || '—'}</p>
              </div>

              {/* Update Vital Signs */}
              <section>
                <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-emerald-400" />
                  Vital Signs
                </h4>
                <form onSubmit={handleSaveVitals} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">BP</label>
                      <input
                        type="text"
                        value={bp}
                        onChange={(e) => setBp(e.target.value)}
                        placeholder="120/80"
                        className="w-full h-9 rounded-lg bg-slate-800 border border-slate-700 px-2 text-slate-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">HR (bpm)</label>
                      <input
                        type="number"
                        value={hr}
                        onChange={(e) => setHr(e.target.value)}
                        placeholder="72"
                        className="w-full h-9 rounded-lg bg-slate-800 border border-slate-700 px-2 text-slate-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">SpO2 %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={spo2}
                        onChange={(e) => setSpo2(e.target.value)}
                        placeholder="98"
                        className="w-full h-9 rounded-lg bg-slate-800 border border-slate-700 px-2 text-slate-100 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Temp (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={temp}
                        onChange={(e) => setTemp(e.target.value)}
                        placeholder="37"
                        className="w-full h-9 rounded-lg bg-slate-800 border border-slate-700 px-2 text-slate-100 text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-400 mb-1">Weight (kg)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="70"
                        className="w-full h-9 rounded-lg bg-slate-800 border border-slate-700 px-2 text-slate-100 text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={savingVitals}
                    className="w-full h-9 rounded-lg bg-emerald-500 text-slate-900 font-medium text-sm hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {savingVitals ? 'Saving...' : 'Save Vitals'}
                  </button>
                </form>
              </section>

              {/* Request Medication → Pharmacy */}
              <section>
                <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                  <Pill className="h-4 w-4 text-amber-400" />
                  Request Medication
                </h4>
                <Link
                  href="/pharmacy"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300 text-sm font-medium hover:bg-amber-500/25 transition-colors"
                >
                  <Pill className="h-4 w-4" />
                  Open Pharmacy
                </Link>
              </section>

              {/* Print Summary (medical report for patient before billing) */}
              <section>
                <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  Medical Summary
                </h4>
                <button
                  type="button"
                  onClick={async () => {
                    if (!patient?.visitId) return
                    try {
                      const res = await fetch(`/api/emergency/visit-summary?visitId=${encodeURIComponent(patient.visitId)}`)
                      if (!res.ok) throw new Error('Failed to load summary')
                      const data = await res.json()
                      const { printMedicalSummary } = await import('@/lib/printUtils')
                      printMedicalSummary(data)
                    } catch (_) {
                      setError('Failed to print summary')
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-600/50 border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-600 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  Print Summary
                </button>
                <p className="text-[10px] text-slate-500 mt-1">Lab, X-Ray, notes — for patient before accountant.</p>
              </section>

              {/* Request Discharge/Transfer → Finance */}
              <section>
                <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-cyan-400" />
                  Discharge / Transfer
                </h4>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!patient?.visitId) return
                      try {
                        const res = await fetch('/api/emergency/doctor/append-task', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ visitId: patient.visitId, type: 'DISCHARGE_REQUESTED' }),
                        })
                        if (res.ok) {
                          showToast('Discharge requested. Finance will clear the bed after payment.', 'success')
                          onSaved()
                        }
                      } catch (_) {
                        setError('Failed to request discharge')
                      }
                    }}
                    disabled={patient?.hasPendingDiagnostics}
                    title={patient?.hasPendingDiagnostics ? 'Complete pending Lab/X-Ray/Sonar first' : undefined}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-sm font-medium hover:bg-cyan-500/25 transition-colors disabled:opacity-50"
                  >
                    <Receipt className="h-4 w-4" />
                    Request discharge (notify Finance)
                  </button>
                  <Link
                    href="/accountant"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-600/50 border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-600 transition-colors"
                  >
                    Open Finance / Billing
                  </Link>
                </div>
                {patient?.hasPendingDiagnostics && (
                  <p className="text-[10px] text-amber-400 mt-1">Pending Lab/X-Ray/Sonar — complete first.</p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </>
  )
}
