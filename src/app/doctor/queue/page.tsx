'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import DoctorSidebar from '@/components/doctor/DoctorSidebar'
import { DoctorCameraQrScanner } from '@/components/doctor/DoctorCameraQrScanner'
import { QrCode, Search } from 'lucide-react'

type ExamQueuePatient = {
  visitId: string
  patientId: string
  name: string
  age: number | null
  gender: string
  phone: string | null
  chiefComplaint: string | null
  triageLevel: number | null
  allergies: string | null
  vitals: {
    bp: string
    temperature: number
    heartRate: number
    weight: number
  } | null
}

const SELECTED_EXAM_VISIT_STORAGE_KEY = 'zion_doctor_exam_visitId'

function writeStoredExamVisitId(visitId: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (visitId) sessionStorage.setItem(SELECTED_EXAM_VISIT_STORAGE_KEY, visitId)
    else sessionStorage.removeItem(SELECTED_EXAM_VISIT_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function normalizeScan(text: string): string {
  return text.trim().replace(/\s+/g, '')
}

export default function DoctorQueueEntrancePage() {
  const router = useRouter()
  const [examQueue, setExamQueue] = useState<ExamQueuePatient[]>([])
  const [examInProgress, setExamInProgress] = useState<ExamQueuePatient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [qrOpen, setQrOpen] = useState(false)

  const loadExamQueues = useCallback(async () => {
    const res = await fetch('/api/doctor/queue')
    const raw = await res.json().catch(() => null)
    if (!res.ok) {
      const msg =
        raw && typeof raw === 'object' && raw !== null && 'error' in raw
          ? String((raw as { error?: string }).error)
          : `Request failed (${res.status})`
      throw new Error(msg)
    }
    const data = raw as { queue?: ExamQueuePatient[]; inProgress?: ExamQueuePatient[] }
    return {
      queue: Array.isArray(data.queue) ? data.queue : [],
      inProgress: Array.isArray(data.inProgress) ? data.inProgress : [],
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const { queue, inProgress } = await loadExamQueues()
        if (cancelled) return
        setExamQueue(queue)
        setExamInProgress(inProgress)
      } catch (e) {
        if (!cancelled) {
          setExamQueue([])
          setExamInProgress([])
          setError((e as Error)?.message || 'Failed to load waiting list')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    const t = setInterval(async () => {
      try {
        const { queue, inProgress } = await loadExamQueues()
        if (cancelled) return
        setExamQueue(queue)
        setExamInProgress(inProgress)
        setError(null)
      } catch (e) {
        if (!cancelled) setError((e as Error)?.message || 'Failed to refresh queue')
      }
    }, 10000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [loadExamQueues])

  const merged = useMemo(() => [...examQueue, ...examInProgress], [examQueue, examInProgress])

  const openWorkstation = useCallback(
    (patient: ExamQueuePatient) => {
      writeStoredExamVisitId(patient.visitId)
      router.push(`/doctor/dashboard/${encodeURIComponent(patient.patientId)}`)
    },
    [router]
  )

  const resolveScanToPatient = useCallback((raw: string, list: ExamQueuePatient[]): ExamQueuePatient | null => {
    const cleaned = normalizeScan(raw)
    if (!cleaned) return null
    const upper = cleaned.toUpperCase()
    const byVisit = list.find(
      (p) =>
        p.visitId === cleaned ||
        p.visitId.toUpperCase() === upper ||
        cleaned.includes(p.visitId) ||
        p.visitId.includes(cleaned)
    )
    if (byVisit) return byVisit
    return (
      list.find(
        (p) =>
          p.patientId === cleaned ||
          p.patientId.toUpperCase() === upper ||
          cleaned.endsWith(p.patientId) ||
          cleaned.includes(p.patientId)
      ) ?? null
    )
  }, [])

  const handleDecoded = useCallback(
    (text: string) => {
      const row = resolveScanToPatient(text, merged)
      if (row) {
        openWorkstation(row)
        return
      }
      const cleaned = normalizeScan(text)
      if (cleaned) {
        writeStoredExamVisitId(null)
        router.push(`/doctor/dashboard/${encodeURIComponent(cleaned)}`)
      }
    },
    [merged, openWorkstation, resolveScanToPatient, router]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return merged
    return merged.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.patientId.toLowerCase().includes(q) ||
        p.visitId.toLowerCase().includes(q) ||
        (p.chiefComplaint && p.chiefComplaint.toLowerCase().includes(q))
      )
    })
  }, [merged, search])

  return (
    <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']} redirectTo="/">
      <div className="flex h-screen max-h-screen overflow-hidden bg-[#0a0f1e]">
        <DoctorSidebar />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-l border-slate-800/40 bg-[#0a0f1e]">
          <div className="shrink-0 border-b border-slate-800/50 px-4 py-4 sm:px-6">
            <h1 className="text-xl font-bold tracking-tight text-white">Patient queue</h1>
            <p className="mt-1 text-sm text-slate-400">Select a patient to open the workstation.</p>
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
              <button
                type="button"
                onClick={() => setQrOpen(true)}
                className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-500/35 bg-[#111827] px-5 text-sm font-semibold text-cyan-200 hover:bg-slate-800/90"
              >
                <QrCode className="h-5 w-5" aria-hidden />
                Scan QR
              </button>
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
                  const statusLabel = inRoom ? 'In consultation' : 'Waiting for exam'
                  return (
                    <button
                      key={p.visitId}
                      type="button"
                      onClick={() => openWorkstation(p)}
                      className="flex min-h-[9rem] flex-col rounded-xl border border-slate-700/70 bg-[#111827] p-4 text-left shadow-sm transition-colors hover:border-blue-500/40 hover:bg-[#161e31] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
                    >
                      <span className="text-lg font-semibold text-white">{p.name}</span>
                      <span className="mt-1 font-mono text-xs text-blue-300/90">ID {p.patientId}</span>
                      <span className="mt-1 text-sm text-slate-400">
                        Age {p.age != null ? p.age : '—'} · {p.gender || '—'}
                      </span>
                      <span
                        className={`mt-auto pt-3 text-[10px] font-bold uppercase tracking-wider ${
                          inRoom ? 'text-amber-400' : 'text-slate-500'
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </main>

        <DoctorCameraQrScanner open={qrOpen} onClose={() => setQrOpen(false)} onDecoded={handleDecoded} />
      </div>
    </ProtectedRoute>
  )
}
