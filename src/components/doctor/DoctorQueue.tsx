'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, PhoneCall, ClipboardList } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'

interface DoctorQueueItem {
  visitId: string
  patientId: string
  name: string
  age: number | null
  gender: string
  phone: string
  chiefComplaint: string | null
  triageLevel: number | null
  allergies: string | null
  vitals: {
    bp: string
    temperature: number
    heartRate: number
    weight: number
  } | null
  /** Optional time arrived / waiting since */
  arrivedAt?: string
}

interface DoctorQueueProps {
  onSelectPatient: (patient: any) => void
  selectedPatientId?: string
}

/** Mock waiting patients when API is unavailable - Name, Priority, Time */
const MOCK_QUEUE: DoctorQueueItem[] = [
  {
    visitId: 'V-MOCK-001',
    patientId: 'P-MOCK-001',
    name: 'Ahmed Hassan',
    age: 34,
    gender: 'Male',
    phone: '+966 50 123 4567',
    chiefComplaint: 'Chest pain',
    triageLevel: 1,
    allergies: 'None',
    vitals: { bp: '120/80', temperature: 36.8, heartRate: 78, weight: 78 },
    arrivedAt: '09:15',
  },
  {
    visitId: 'V-MOCK-002',
    patientId: 'P-MOCK-002',
    name: 'Sara Mohammed',
    age: 28,
    gender: 'Female',
    phone: '+966 55 987 6543',
    chiefComplaint: 'Migraine',
    triageLevel: 3,
    allergies: 'Penicillin',
    vitals: { bp: '118/76', temperature: 36.5, heartRate: 72, weight: 62 },
    arrivedAt: '09:42',
  },
  {
    visitId: 'V-MOCK-003',
    patientId: 'P-MOCK-003',
    name: 'Omar Khalid',
    age: 52,
    gender: 'Male',
    phone: '+966 54 111 2233',
    chiefComplaint: 'Follow-up diabetes',
    triageLevel: 4,
    allergies: 'None',
    vitals: { bp: '132/84', temperature: 36.6, heartRate: 82, weight: 88 },
    arrivedAt: '10:05',
  },
  {
    visitId: 'V-MOCK-004',
    patientId: 'P-MOCK-004',
    name: 'Layla Ibrahim',
    age: 5,
    gender: 'Female',
    phone: '+966 53 444 5566',
    chiefComplaint: 'Fever & cough',
    triageLevel: 2,
    allergies: 'None',
    vitals: { bp: '95/60', temperature: 38.2, heartRate: 110, weight: 18 },
    arrivedAt: '10:20',
  },
]

function toPatientPayload(p: DoctorQueueItem, isReadyForReview?: boolean) {
  return {
    id: p.patientId,
    name: p.name,
    age: p.age ?? 'N/A',
    gender: p.gender,
    phone: p.phone,
    visitId: p.visitId,
    chiefComplaint: p.chiefComplaint,
    allergies: p.allergies,
    triageLevel: p.triageLevel,
    vitalSigns: p.vitals
      ? {
          bp: p.vitals.bp,
          temperature: p.vitals.temperature,
          heartRate: p.vitals.heartRate,
          weight: p.vitals.weight,
        }
      : null,
    ...(isReadyForReview && { isReadyForReview: true }),
  }
}

export default function DoctorQueue({
  onSelectPatient,
  selectedPatientId,
}: DoctorQueueProps) {
  const [queue, setQueue] = useState<DoctorQueueItem[]>([])
  const [readyForReview, setReadyForReview] = useState<DoctorQueueItem[]>([])
  const [inProgress, setInProgress] = useState<DoctorQueueItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [callingBack, setCallingBack] = useState<string | null>(null)
  const { t, formatNumber } = useLanguage()
  const { user } = useAuth()
  const isSecretary = user?.role === 'SECRETARY'

  useEffect(() => {
    const loadQueue = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const res = await fetch('/api/doctor/queue')
        if (!res.ok) {
          const text = await res.text()
          throw new Error(text || 'Failed to load doctor queue.')
        }
        const data = await res.json()
        // Support both new shape { queue, readyForReview, inProgress } and legacy array
        if (Array.isArray(data)) {
          setQueue(data)
          setReadyForReview([])
          setInProgress([])
        } else {
          setQueue(data.queue ?? [])
          setReadyForReview(data.readyForReview ?? [])
          setInProgress(data.inProgress ?? [])
        }
      } catch (err: any) {
        console.warn('Doctor queue API unavailable, using mock data:', err?.message)
        setError(null)
        setQueue(MOCK_QUEUE)
        setReadyForReview([])
        setInProgress([])
      } finally {
        setIsLoading(false)
      }
    }

    loadQueue()
    const interval = setInterval(loadQueue, 15000)
    return () => clearInterval(interval)
  }, [])

  const handleCallBack = async (visitId: string) => {
    setCallingBack(visitId)
    try {
      const res = await fetch(`/api/visits/${visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'In_Consultation' }),
      })
      if (!res.ok) throw new Error('Failed to call back')
      // Reload queue so patient moves to In progress
      const qRes = await fetch('/api/doctor/queue')
      if (qRes.ok) {
        const d = await qRes.json()
        if (!Array.isArray(d)) {
          setQueue(d.queue ?? [])
          setReadyForReview(d.readyForReview ?? [])
          setInProgress(d.inProgress ?? [])
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCallingBack(null)
    }
  }

  const criticalPatients = queue.filter(
    p => p.triageLevel != null && p.triageLevel <= 2
  )
  const normalPatients = queue.filter(
    p => !p.triageLevel || p.triageLevel > 2
  )
  const totalWaiting = queue.length

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-800/50 flex-shrink-0">
        <h2 className="text-base font-semibold text-primary mb-0.5">
          {isSecretary ? t('patient.waiting') + ' / Ready for Review' : t('patient.waiting')}
        </h2>
        <p className="text-xs text-secondary">
          {formatNumber(totalWaiting)} {t('common.inQueue')}
          {readyForReview.length > 0 && (
            <span className="ml-2 text-amber-400 font-semibold">
              • {readyForReview.length} Ready for Review
            </span>
          )}
          {criticalPatients.length > 0 && (
            <span className="ml-2 text-red-400 font-semibold">
              • {criticalPatients.length} CRITICAL
            </span>
          )}
        </p>
      </div>

      {criticalPatients.length > 0 && (
        <div className="bg-red-600/20 border-b-2 border-red-500/70 px-4 py-2 flex-shrink-0 animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <p className="text-xs font-bold text-red-300 uppercase tracking-wide">
              ⚠️ {criticalPatients.length} CRITICAL PATIENT(S) - TRIAGE LEVEL 1-2
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-2">
          {isLoading && queue.length === 0 && readyForReview.length === 0 && inProgress.length === 0 && (
            <p className="text-[11px] text-slate-500">Loading patients...</p>
          )}

          {/* In progress (in room) */}
          {inProgress.length > 0 && (
            <>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                <ClipboardList className="h-3.5 w-3.5" /> In room
              </p>
              {inProgress.map(p => {
                const isSelected = selectedPatientId === p.patientId
                return (
                  <button
                    key={p.visitId}
                    onClick={() => onSelectPatient(toPatientPayload(p, true))}
                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                      isSelected ? 'bg-cyan-500/10 border-cyan-500/30' : 'glass border-slate-700/50 hover:border-slate-600/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-primary">{p.name}</h3>
                        <p className="text-[11px] text-secondary">{p.chiefComplaint || '—'}</p>
                      </div>
                      <span className="text-[10px] text-slate-500">In room</span>
                    </div>
                  </button>
                )
              })}
            </>
          )}

          {/* Ready for Review (priority re-entry) */}
          {readyForReview.length > 0 && (
            <>
              <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wide flex items-center gap-1 mt-2">
                <ClipboardList className="h-3.5 w-3.5" /> Ready for Review (results back)
              </p>
              {readyForReview.map(p => {
                const isSelected = selectedPatientId === p.patientId
                const isCalling = callingBack === p.visitId
                return (
                  <div
                    key={p.visitId}
                    className="flex gap-2 items-stretch rounded-lg border border-amber-500/40 bg-amber-500/10 overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        isSecretary
                          ? undefined
                          : onSelectPatient(toPatientPayload(p, true))
                      }
                      className={`flex-1 text-left p-3 transition-all duration-200 ${
                        isSecretary ? 'cursor-default' : 'hover:bg-amber-500/15'
                      } ${isSelected ? 'bg-amber-500/20' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-amber-200">{p.name}</h3>
                          <p className="text-[11px] text-amber-200/80">{p.chiefComplaint || '—'}</p>
                        </div>
                        {!isSecretary && (
                          <span className="text-[10px] text-amber-300/80">Select to review</span>
                        )}
                      </div>
                    </button>
                    {isSecretary && (
                      <button
                        onClick={() => handleCallBack(p.visitId)}
                        disabled={!!callingBack}
                        className="px-4 bg-amber-500/30 text-amber-100 border-l border-amber-500/50 hover:bg-amber-500/40 flex items-center gap-1.5 text-xs font-medium"
                        title="Call patient back to room"
                      >
                        <PhoneCall className="h-4 w-4" />
                        {isCalling ? 'Calling…' : 'Call back'}
                      </button>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* CRITICAL PATIENTS (Waiting) */}
          {criticalPatients.map(p => {
            const hasAllergy =
              p.allergies &&
              p.allergies.trim() !== '' &&
              p.allergies.trim().toLowerCase() !== 'none'
            const isSelected = selectedPatientId === p.patientId
            return (
              <button
                key={p.visitId}
                onClick={() => onSelectPatient(toPatientPayload(p))}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all duration-200 ${
                  isSelected
                    ? 'bg-red-600/20 border-red-500/70 shadow-lg shadow-red-500/30'
                    : 'bg-red-600/10 border-red-500/50 hover:border-red-500/70 hover:bg-red-600/15 animate-pulse'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold truncate text-red-200">{p.name}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600/30 text-red-100 border border-red-400/70 animate-pulse">
                        ESI {p.triageLevel} - CRITICAL
                      </span>
                      {hasAllergy && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-400/30 text-amber-100 border border-amber-400/70">
                          <AlertTriangle className="h-3 w-3" />
                          Allergy
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-red-300/80 mt-0.5">
                      {p.age !== null ? `${formatNumber(p.age)} ${t('common.years')}` : 'Age N/A'}
                      {', '}
                      {p.gender || 'N/A'}
                    </p>
                  </div>
                </div>
                {p.chiefComplaint && (
                  <p className="text-[11px] text-red-200/90 line-clamp-2 leading-tight mb-1 font-medium">
                    {p.chiefComplaint}
                  </p>
                )}
                {(p as any).billStatus !== undefined && (
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {(p as any).billStatus === 'Pending' && (
                      <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 rounded text-[10px] font-semibold text-amber-300">
                        Bill Pending
                      </span>
                    )}
                    {(p as any).medsReady && (
                      <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 rounded text-[10px] font-semibold text-emerald-300">
                        Meds Ready
                      </span>
                    )}
                  </div>
                )}
                {p.vitals && (
                  <div className="flex items-center gap-3 text-[10px] text-red-300/70 mt-1">
                    <span>BP: {p.vitals.bp}</span>
                    <span>Temp: {p.vitals.temperature}°C</span>
                    <span>HR: {p.vitals.heartRate} bpm</span>
                  </div>
                )}
              </button>
            )
          })}

          {/* NORMAL PATIENTS (Waiting) */}
          {normalPatients.map(p => {
            const hasAllergy =
              p.allergies &&
              p.allergies.trim() !== '' &&
              p.allergies.trim().toLowerCase() !== 'none'
            const isSelected = selectedPatientId === p.patientId
            return (
              <button
                key={p.visitId}
                onClick={() => onSelectPatient(toPatientPayload(p))}
                className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                    : 'glass border-slate-800/50 hover:border-slate-700/50 hover:bg-slate-800/20'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate text-primary">{p.name}</h3>
                      {p.triageLevel && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700/30 text-slate-300 border border-slate-600/50">
                          ESI {p.triageLevel}
                        </span>
                      )}
                      {hasAllergy && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-400/20 text-amber-100 border border-amber-400/70">
                          <AlertTriangle className="h-3 w-3" />
                          Allergy
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-secondary mt-0.5">
                      {p.age !== null ? `${formatNumber(p.age)} ${t('common.years')}` : 'Age N/A'}
                      {', '}
                      {p.gender || 'N/A'}
                    </p>
                  </div>
                </div>
                {p.chiefComplaint && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-tight mb-1">
                    {p.chiefComplaint}
                  </p>
                )}
                {(p as any).billStatus !== undefined && (
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {(p as any).billStatus === 'Pending' && (
                      <span className="px-2 py-0.5 bg-amber-500/20 border border-amber-500/40 rounded text-[10px] font-semibold text-amber-300">
                        Bill Pending
                      </span>
                    )}
                {(p as any).medsReady && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/40 rounded text-[10px] font-semibold text-emerald-300">
                    Meds Ready
                  </span>
                )}
              </div>
                )}
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[11px] text-slate-500">{p.phone}</p>
                  {p.arrivedAt && (
                    <span className="text-[10px] text-slate-500">Time: {p.arrivedAt}</span>
                  )}
                </div>
              </button>
            )
          })}

          {!isLoading && totalWaiting === 0 && readyForReview.length === 0 && inProgress.length === 0 && !error && (
            <p className="text-[11px] text-slate-500">
              No patients waiting with completed vitals.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
