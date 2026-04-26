'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  HeartPulse,
  Thermometer,
  Weight,
  CheckCircle,
  X,
  User,
  Users,
} from 'lucide-react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import BackButton from '@/components/BackButton'
import ZionMedLogo from '@/components/ZionMedLogo'
import { useAuth, USER_ROLES } from '@/contexts/AuthContext'

interface WaitingPatient {
  visitId: string
  patientId: string
  firstName: string
  lastName: string
  phone: string
  triageLevel: number | null
  allergies: string | null
}

export default function IntakePage() {
  return (
    <ProtectedRoute
      allowedRoles={[
        USER_ROLES.INTAKE_NURSE,
        USER_ROLES.ER_NURSE,
        USER_ROLES.ADMIN,
      ]}
      redirectTo="/"
    >
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main Content - Full Width Intake Dashboard */}
          <main className="flex-1 overflow-hidden p-6 pb-6">
            <div className="h-full w-full">
              <IntakeNurseDashboard />
            </div>
          </main>
        </div>
      </div>
      <BackButton />
    </ProtectedRoute>
  )
}

/* ---------- Intake Nurse Dashboard ---------- */

interface VitalsFormState {
  bp: string
  temperature: string
  heartRate: string
  oxygen: string
  weight: string
  allergies: string
  triageLevel: string
}

function IntakeNurseDashboard() {
  const { user } = useAuth()
  const [waitingPatients, setWaitingPatients] = useState<WaitingPatient[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedPatient, setSelectedPatient] = useState<WaitingPatient | null>(
    null
  )
  const [formState, setFormState] = useState<VitalsFormState>({
    bp: '',
    temperature: '',
    heartRate: '',
    oxygen: '',
    weight: '',
    allergies: '',
    triageLevel: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showToast, setShowToast] = useState(false)
  const toastTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const loadWaitingPatients = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 10000)
      const res = await fetch('/api/intake/waiting', { signal: controller.signal })
      window.clearTimeout(timeoutId)
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to load waiting patients.')
      }

      const data: WaitingPatient[] = await res.json()
      setWaitingPatients(data)
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setError('Loading waiting patients timed out. Please retry.')
      } else {
        setError(err?.message || 'Failed to load waiting patients.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWaitingPatients()
  }, [])

  const handleSelectPatient = (patient: WaitingPatient) => {
    setSelectedPatient(patient)
    setSuccessMessage(null)
    setFormState({
      bp: '',
      temperature: '',
      heartRate: '',
      oxygen: '',
      weight: '',
      allergies: patient.allergies || '',
      triageLevel: patient.triageLevel ? String(patient.triageLevel) : '',
    })
  }

  const handleChange = (field: keyof VitalsFormState, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatient) return

    setError(null)
    setSuccessMessage(null)

    const { bp, temperature, heartRate, oxygen, weight, allergies, triageLevel } =
      formState

    if (!bp || !temperature || !heartRate || !weight || !allergies || !triageLevel) {
      setError(
        'All fields are mandatory. If there are no allergies, please type "None".'
      )
      return
    }

    const triageNum = parseInt(triageLevel, 10)
    if (isNaN(triageNum) || triageNum < 1 || triageNum > 5) {
      setError('Triage level must be between 1 and 5.')
      return
    }

    // Blood pressure: must contain '/' in systolic/diastolic format
    const bpRegex = /^\d{2,3}\/\d{2,3}$/
    if (!bpRegex.test(bp.trim())) {
      setError("Blood pressure must include '/' and be in format like 120/80")
      return
    }

    // Temperature: 35°C – 42°C
    const tempNum = parseFloat(temperature)
    if (isNaN(tempNum) || tempNum < 35 || tempNum > 42) {
      setError('Temperature must be between 35°C and 42°C')
      return
    }

    // Heart rate: 20 – 300 bpm
    const hrNum = parseInt(heartRate, 10)
    if (isNaN(hrNum) || hrNum < 20 || hrNum > 300) {
      setError('Heart rate must be between 20 and 300 bpm')
      return
    }

    let oxygenNum: number | null = null
    if (oxygen.trim()) {
      const parsedOxygen = parseInt(oxygen, 10)
      if (isNaN(parsedOxygen) || parsedOxygen < 50 || parsedOxygen > 100) {
        setError('Oxygen saturation must be between 50 and 100')
        return
      }
      oxygenNum = parsedOxygen
    }

    try {
      setIsSaving(true)

      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 12000)
      const res = await fetch('/api/intake/vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          patientId: selectedPatient.patientId,
          visitId: selectedPatient.visitId,
          bp,
          temperature: parseFloat(temperature),
          heartRate: parseInt(heartRate, 10),
          oxygen: oxygenNum,
          weight: parseFloat(weight),
          allergies: allergies.trim(),
          triageLevel: triageNum,
        }),
      })
      window.clearTimeout(timeoutId)

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to save vitals.')
      }

      setSuccessMessage('Vitals and triage information saved successfully.')
      
      // Show toast notification
      setShowToast(true)
      
      // Auto-dismiss toast after 4 seconds
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(() => setShowToast(false), 4000)

      // Refresh waiting list to reflect updated triage/allergy flags
      await loadWaitingPatients()
      setSelectedPatient(null)
      setFormState({
        bp: '',
        temperature: '',
        heartRate: '',
        oxygen: '',
        weight: '',
        allergies: '',
        triageLevel: '',
      })
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        setError('Saving vitals timed out. Please retry.')
      } else {
        setError(err?.message || 'Failed to save vitals. Please try again.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* Success Toast Notification - Top Right */}
      {showToast && (
        <div className="fixed top-6 right-6 z-[100] animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="bg-emerald-500 text-white rounded-xl shadow-2xl border-2 border-emerald-400/50 px-6 py-4 flex items-center gap-4 min-w-[360px] backdrop-blur-sm">
            <div className="flex-shrink-0">
              <CheckCircle className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold flex-1 text-right">
              تم حفظ العلامات الحيوية للمريض بنجاح
            </p>
            <button
              onClick={() => setShowToast(false)}
              className="text-emerald-100 hover:text-white transition-colors flex-shrink-0"
              aria-label="Close notification"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <section className="glass h-full rounded-xl border border-slate-800/60 p-6 pb-6 flex flex-col overflow-hidden">
        <div className="flex-1 flex gap-3 overflow-hidden min-h-0">
        {/* If user is not Intake Nurse, show read-only message */}
        {user?.role !== USER_ROLES.INTAKE_NURSE && user?.role !== USER_ROLES.ADMIN ? (
          <div className="w-full flex items-center justify-center text-center">
            <p className="text-xs text-slate-500 max-w-sm">
              Vitals entry is restricted to Intake Nurse staff. You can view the waiting
              list from your own module (Reception, Doctor, or Admin).
            </p>
          </div>
        ) : (
        <>
        {/* Waiting list - Left Sidebar */}
        <div className="w-64 flex-shrink-0 flex flex-col border border-slate-800/80 rounded-xl bg-slate-950/70 overflow-hidden shadow-lg">
          <div className="px-3 py-2 border-b border-slate-800/80 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-semibold text-slate-200">
              Waiting Patients
            </span>
            {isLoading && (
              <span className="text-[11px] text-slate-400">Loading...</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 p-3">
            {error && (
              <div className="mb-3 p-3 rounded-lg border border-rose-500/30 bg-rose-500/5">
                <p className="text-xs text-rose-400">
                  {error}
                </p>
              </div>
            )}
            {waitingPatients.length === 0 && !isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Users className="h-12 w-12 text-slate-600 mb-3" />
                <p className="text-sm text-slate-500 font-medium">
                  No waiting patients found.
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Patients will appear here after registration.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {waitingPatients.map(p => {
                  const critical = p.triageLevel !== null && p.triageLevel <= 2
                  const hasAllergy =
                    p.allergies !== null &&
                    p.allergies.trim() !== '' &&
                    p.allergies.trim().toLowerCase() !== 'none'

                  const isSelected = selectedPatient?.visitId === p.visitId

                  return (
                    <button
                      key={p.visitId}
                      type="button"
                      onClick={() => handleSelectPatient(p)}
                      className={`w-full text-left p-4 rounded-xl border border-slate-800/60 transition-all duration-200 ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/40 shadow-lg shadow-cyan-500/20'
                          : 'bg-slate-900/50 hover:bg-slate-900/70 hover:border-slate-700/60 shadow-sm shadow-black/10'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* User Icon */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          isSelected
                            ? 'bg-cyan-500/20 text-cyan-400'
                            : 'bg-slate-800/50 text-slate-400'
                        }`}>
                          <User className="h-5 w-5" />
                        </div>
                        
                        {/* Patient Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className={`text-lg font-bold ${
                              isSelected ? 'text-cyan-200' : 'text-slate-100'
                            }`}>
                              {p.firstName} {p.lastName}
                            </span>
                            {critical && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-600/20 text-red-300 border border-red-500/60 animate-pulse">
                                ESI {p.triageLevel ?? '?'}
                              </span>
                            )}
                            {hasAllergy && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-400/15 text-amber-300 border border-amber-400/50">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Allergy
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            {p.phone}
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Vitals form - Full Width Right Side */}
        <div className="flex-1 flex flex-col border border-slate-800/80 rounded-xl bg-slate-950/70 px-5 py-4 overflow-hidden min-h-0 shadow-lg">

          {!selectedPatient ? (
            <div className="flex-1 flex items-center justify-center text-center">
              <p className="text-xs text-slate-500 max-w-xs">
                Select a patient from the waiting list to record vitals, allergies,
                and triage level.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSaveVitals}
              className="flex-1 flex flex-col gap-3 overflow-hidden min-h-0"
            >
              <div className="flex-1 grid grid-cols-2 gap-3 overflow-y-auto pr-1 min-h-0">
                {/* Row 1: BP and Temperature */}
                <div className="flex flex-col">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Blood Pressure (BP)
                  </label>
                  <input
                    type="text"
                    value={formState.bp}
                    onChange={e => handleChange('bp', e.target.value)}
                    placeholder="e.g. 120/80"
                    className="w-full h-14 rounded-lg bg-slate-900/70 border border-slate-700/70 px-5 text-lg text-center text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="block text-base font-semibold text-slate-300 mb-2.5">
                    Temperature (°C)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={formState.temperature}
                      onChange={e =>
                        handleChange('temperature', e.target.value)
                      }
                      placeholder="e.g. 37.2"
                      className="w-full h-14 rounded-lg bg-slate-900/70 border border-slate-700/70 px-5 pr-10 text-lg text-center text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                    />
                    <Thermometer className="h-4 w-4 text-emerald-300 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Row 2: Heart Rate and Weight */}
                <div className="flex flex-col">
                  <label className="block text-base font-semibold text-slate-300 mb-2.5">
                    Heart Rate (bpm)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={formState.heartRate}
                      onChange={e => handleChange('heartRate', e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="e.g. 78"
                      className="w-full h-14 rounded-lg bg-slate-900/70 border border-slate-700/70 px-5 pr-10 text-lg text-center text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                    />
                    <HeartPulse className="h-4 w-4 text-emerald-300 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="block text-base font-semibold text-slate-300 mb-2.5">
                    Oxygen Saturation (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={50}
                      max={100}
                      value={formState.oxygen}
                      onChange={e => handleChange('oxygen', e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="e.g. 98"
                      className="w-full h-14 rounded-lg bg-slate-900/70 border border-slate-700/70 px-5 pr-10 text-lg text-center text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                    />
                    <Activity className="h-4 w-4 text-emerald-300 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <label className="block text-base font-semibold text-slate-300 mb-2.5">
                    Weight (kg)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={formState.weight}
                      onChange={e => handleChange('weight', e.target.value.replace(/[^0-9.]/g, ''))}
                      placeholder="e.g. 72.5"
                      className="w-full h-14 rounded-lg bg-slate-900/70 border border-slate-700/70 px-5 pr-10 text-lg text-center text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                    />
                    <Weight className="h-4 w-4 text-emerald-300 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Row 3: Allergies and Triage Level */}
                <div className="flex flex-col">
                  <label className="block text-base font-semibold text-slate-300 mb-2.5">
                    Allergies (type &quot;None&quot; if no allergies)
                  </label>
                  <textarea
                    value={formState.allergies}
                    onChange={e => handleChange('allergies', e.target.value)}
                    placeholder='e.g. Penicillin, Latex – or type "None"'
                    rows={2}
                    className="w-full min-h-[56px] rounded-lg bg-slate-900/70 border border-slate-700/70 px-5 py-3 text-lg text-center text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 resize-none transition-all"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="block text-base font-semibold text-slate-300 mb-2.5">
                    ESI Triage Level (1–5)
                  </label>
                  <select
                    value={formState.triageLevel}
                    onChange={e => handleChange('triageLevel', e.target.value)}
                    className="w-full h-14 rounded-lg bg-slate-900/70 border border-slate-700/70 px-5 text-lg text-center text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
                  >
                    <option value="">Select level</option>
                    <option value="1">1 – Critical (Immediate)</option>
                    <option value="2">2 – High (Very Urgent)</option>
                    <option value="3">3 – Medium</option>
                    <option value="4">4 – Low</option>
                    <option value="5">5 – Routine</option>
                  </select>
                </div>
              </div>

              {/* Messages */}
              {error && (
                <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/40 rounded-md px-4 py-2.5 flex-shrink-0">
                  {error}
                </p>
              )}
              {successMessage && (
                <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/40 rounded-md px-4 py-2.5 flex-shrink-0">
                  {successMessage}
                </p>
              )}

              {/* Sticky Save Button at Bottom - Full Width */}
              <div className="flex-shrink-0 pt-3 border-t border-slate-800/50 mt-auto bg-slate-950/70 -mx-5 px-5">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 text-slate-950 text-base font-bold px-8 py-3.5 hover:bg-emerald-600 active:bg-emerald-700 transition-colors disabled:opacity-60 shadow-lg shadow-emerald-500/30"
                >
                  {isSaving ? 'Saving...' : 'Save Vitals & Triage'}
                </button>
              </div>
            </form>
          )}
        </div>
        </>
        )}
      </div>
    </section>
    </>
  )
}


