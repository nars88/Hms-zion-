'use client'

import { useCallback, useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Stethoscope, LogOut, Barcode, CheckCircle2, Search, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

type Resolved = { patientId: string; visitId: string | null; patientName: string }
type SearchPatient = {
  id: string
  firstName: string
  lastName: string
  phone?: string | null
  latestVisitId?: string | null
}
const MANUAL_VISIT_CODE_REGEX = /^(ZION|ER)-\d{8}-\d{4}$/i
type LastSubmission = {
  resolved: Resolved
  patientNameInput: string
  bpSystolic: string
  bpDiastolic: string
  temp: string
  hr: string
  spo2: string
  painScale: number
}
type TodayReferral = {
  visitId: string
  patientId: string
  patientName: string
  referralTime: string
  statusLabel: string
}

export function ERVitalsStationInner({ basePath }: { basePath: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const scanInputRef = useRef<HTMLInputElement | null>(null)

  const [scannerCode, setScannerCode] = useState('')
  const [resolved, setResolved] = useState<Resolved | null>(null)
  const [resolvedChiefComplaint, setResolvedChiefComplaint] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [editLast, setEditLast] = useState<LastSubmission | null>(null)

  const [manualOpen, setManualOpen] = useState(false)
  const [manualQuery, setManualQuery] = useState('')
  const [manualResults, setManualResults] = useState<SearchPatient[]>([])
  const [manualLoading, setManualLoading] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)

  const [bpSystolic, setBpSystolic] = useState('')
  const [bpDiastolic, setBpDiastolic] = useState('')
  const [temp, setTemp] = useState('')
  const [hr, setHr] = useState('')
  const [spo2, setSpo2] = useState('')
  const [painScale, setPainScale] = useState(0)
  const [patientNameInput, setPatientNameInput] = useState('')
  const [todayReferrals, setTodayReferrals] = useState<TodayReferral[]>([])
  const [referralsLoading, setReferralsLoading] = useState(false)
  const diastolicRef = useRef<HTMLInputElement | null>(null)

  const focusScannerInput = useCallback(() => {
    window.setTimeout(() => {
      scanInputRef.current?.focus()
      scanInputRef.current?.select()
    }, 30)
  }, [])

  const loadTodayReferrals = useCallback(async () => {
    setReferralsLoading(true)
    try {
      const res = await fetch('/api/emergency/referrals/today')
      const data = (await res.json().catch(() => ({}))) as { referrals?: TodayReferral[] }
      if (res.ok && Array.isArray(data.referrals)) {
        setTodayReferrals(data.referrals)
      }
    } finally {
      setReferralsLoading(false)
    }
  }, [])

  const applyResolved = useCallback(
    (r: Resolved) => {
      setResolved(r)
      const q = new URLSearchParams()
      q.set('patientId', r.patientId)
      if (r.visitId) q.set('visitId', r.visitId)
      q.set('patientName', r.patientName || 'Patient')
      router.replace(`${basePath}?${q.toString()}`)
    },
    [router, basePath]
  )

  const resolveCode = useCallback(
    async (raw: string) => {
      const code = raw.trim()
      if (!code) return
      setBusy(true)
      setMsg(null)
      try {
        const res = await fetch(`/api/scanner/resolve?code=${encodeURIComponent(code)}`)
        const data = (await res.json()) as {
          patientId?: string
          visitId?: string | null
          patientName?: string
          error?: string
        }
        if (!res.ok || data.error || !data.patientId) {
          throw new Error(data.error || 'Invalid QR badge')
        }
        if (!data.visitId) {
          throw new Error('No active ER visit for this patient.')
        }
        applyResolved({
          patientId: data.patientId,
          visitId: data.visitId,
          patientName: data.patientName || 'Patient',
        })
      } catch (e: unknown) {
        setMsg({ type: 'err', text: (e as Error).message || 'Resolve failed' })
        focusScannerInput()
      } finally {
        setBusy(false)
        setScannerCode('')
      }
    },
    [applyResolved, focusScannerInput]
  )

  useEffect(() => {
    const pid = searchParams.get('patientId')?.trim()
    const vid = searchParams.get('visitId')?.trim()
    const pname = searchParams.get('patientName')?.trim()
    if (pid && vid) {
      const nextName = pname || 'Patient'
      setResolved({ patientId: pid, visitId: vid, patientName: nextName })
      setPatientNameInput(nextName)
    } else {
      setResolved(null)
      setPatientNameInput('')
      setResolvedChiefComplaint(null)
    }
  }, [searchParams])

  useEffect(() => {
    let cancelled = false
    const loadComplaint = async () => {
      if (!resolved?.visitId) {
        setResolvedChiefComplaint(null)
        return
      }
      try {
        const res = await fetch(`/api/visits/${encodeURIComponent(resolved.visitId)}`)
        const data = (await res.json().catch(() => ({}))) as {
          visit?: { chiefComplaint?: string | null }
        }
        if (cancelled) return
        setResolvedChiefComplaint(data.visit?.chiefComplaint || null)
      } catch {
        if (!cancelled) setResolvedChiefComplaint(null)
      }
    }
    void loadComplaint()
    return () => {
      cancelled = true
    }
  }, [resolved?.visitId])

  useEffect(() => {
    if (!resolved && !busy) focusScannerInput()
  }, [resolved, busy, focusScannerInput])

  useEffect(() => {
    void loadTodayReferrals()
    const id = window.setInterval(() => void loadTodayReferrals(), 15000)
    return () => window.clearInterval(id)
  }, [loadTodayReferrals])

  useEffect(() => {
    if (!manualOpen) return
    const query = manualQuery.trim()
    if (query.length < 2) {
      setManualResults([])
      setManualError(null)
      return
    }

    const id = window.setTimeout(async () => {
      setManualLoading(true)
      setManualError(null)
      try {
        if (MANUAL_VISIT_CODE_REGEX.test(query)) {
          const res = await fetch(`/api/scanner/resolve?code=${encodeURIComponent(query)}`)
          const data = (await res.json()) as {
            patientId?: string
            visitId?: string | null
            patientName?: string
            error?: string
          }
          if (!res.ok || data.error || !data.patientId) {
            throw new Error(data.error || 'Visit/Badge ID not found')
          }
          setManualResults([
            {
              id: data.patientId,
              firstName: data.patientName?.trim() || 'Patient',
              lastName: '',
              phone: null,
            },
          ])
          return
        }
        const res = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`)
        const data = (await res.json()) as { patients?: SearchPatient[]; error?: string }
        if (!res.ok) throw new Error(data.error || 'Search failed')
        setManualResults(Array.isArray(data.patients) ? data.patients : [])
      } catch (e: unknown) {
        setManualError((e as Error).message || 'Search failed')
        setManualResults([])
      } finally {
        setManualLoading(false)
      }
    }, 250)

    return () => window.clearTimeout(id)
  }, [manualQuery, manualOpen])

  const submitVitals = async (isCritical: boolean) => {
    if (!resolved?.visitId) {
      setMsg({ type: 'err', text: 'Scan patient QR badge first.' })
      return
    }
    const bpVal = `${bpSystolic.trim()}/${bpDiastolic.trim()}`
    const t = parseFloat(temp)
    const h = parseInt(hr, 10)
    const s = parseFloat(spo2)
    if (!/^\d{2,3}\/\d{2,3}$/.test(bpVal)) {
      setMsg({ type: 'err', text: 'Enter BP as systolic/diastolic (e.g. 120/80).' })
      return
    }
    if (!Number.isFinite(t) || !Number.isFinite(h) || !Number.isFinite(s)) {
      setMsg({ type: 'err', text: 'Temp, HR, and SpO2 are required.' })
      return
    }
    if (s < 50 || s > 100) {
      setMsg({ type: 'err', text: 'SpO2 must be 50-100%.' })
      return
    }
    if (h < 30 || h > 190) {
      setMsg({ type: 'err', text: 'Heart rate must be 30-190 bpm.' })
      return
    }
    const snapshot: LastSubmission = {
      resolved,
      patientNameInput,
      bpSystolic,
      bpDiastolic,
      temp,
      hr,
      spo2,
      painScale,
    }
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/emergency/vitals-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: resolved.patientId,
          visitId: resolved.visitId,
          bp: String(bpVal),
          temperature: t,
          heartRate: h,
          spo2: s,
          painScale: painScale > 0 ? String(painScale) : undefined,
          isCritical,
        }),
      })
      const raw = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error((raw as { error?: string }).error || 'Save failed')
      setSuccessToast('Data sent successfully to the Doctor! 🩺')
      window.setTimeout(() => setSuccessToast(null), 3000)
      setEditLast(snapshot)
      window.setTimeout(() => setEditLast(null), 10000)
      setBpSystolic('')
      setBpDiastolic('')
      setTemp('')
      setHr('')
      setSpo2('')
      setPainScale(0)
      setResolved(null)
      router.replace(basePath)
      focusScannerInput()
      await loadTodayReferrals()
    } catch (e: unknown) {
      setMsg({ type: 'err', text: 'Connection failed. Please try again.' })
    } finally {
      setBusy(false)
    }
  }

  const handleSave = async () => submitVitals(false)
  const handleCriticalSave = async () => submitVitals(true)

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-2 md:px-8">
      {successToast ? (
        <div className="pointer-events-none fixed left-1/2 top-4 z-[120] -translate-x-1/2 rounded-xl border border-emerald-400/40 bg-emerald-500/20 px-5 py-2.5 text-sm font-semibold text-emerald-100 shadow-xl">
          {successToast}
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="select-none text-[120px] font-black tracking-[0.35em] text-cyan-500/5 md:text-[220px]">
          ZION
        </span>
      </div>

      <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col space-y-2">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10">
            <Stethoscope className="h-5 w-5 text-cyan-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">ER Vitals Station</h1>
            <p className="text-xs text-slate-400">Scan Patient QR Badge</p>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[300px_1fr]">
          <aside className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-4">
            <h3 className="mb-3 text-sm font-bold text-slate-100">Today Referrals</h3>
            {referralsLoading ? (
              <p className="text-xs text-slate-400">Loading...</p>
            ) : todayReferrals.length === 0 ? (
              <p className="text-xs text-slate-500">No referrals yet today.</p>
            ) : (
              <div className="space-y-2">
                {todayReferrals.map((row) => (
                  <div key={row.visitId} className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-2.5">
                    <p className="text-sm font-semibold text-slate-100">{row.patientName}</p>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-400">{new Date(row.referralTime).toLocaleTimeString()}</p>
                      <p className="text-[11px] font-semibold text-cyan-300">{row.statusLabel}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>

          <div className="min-h-0">
        {!resolved ? (
          <div className="space-y-3 pt-2">
            <input
              ref={scanInputRef}
              value={scannerCode}
              onChange={(e) => setScannerCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (!busy && scannerCode.trim()) void resolveCode(scannerCode)
                }
              }}
              autoFocus
              placeholder="[Scanner Icon] Scan Patient Badge..."
              className="h-20 w-full rounded-2xl border-2 border-slate-700 bg-slate-950/80 px-6 text-xl font-bold text-slate-100 placeholder-slate-500 outline-none transition focus:border-cyan-400"
            />

            <div className="flex items-center gap-2 text-sm text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              <span>Scanner Ready.</span>
            </div>

            {msg ? (
              <p className={`text-sm ${msg.type === 'ok' ? 'text-emerald-300' : 'text-rose-400'}`}>{msg.text}</p>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setManualOpen(true)
                setManualQuery('')
                setManualResults([])
                setManualError(null)
              }}
              className="text-sm text-slate-400 underline underline-offset-4 hover:text-cyan-300"
            >
              Need manual entry? Search by ID or Name
            </button>

            {editLast ? (
              <div className="fixed bottom-4 left-1/2 z-[110] -translate-x-1/2 rounded-xl border border-cyan-400/40 bg-slate-900/95 px-4 py-2 text-sm text-slate-200 shadow-xl">
                Last entry saved.
                <button
                  type="button"
                  className="ml-2 font-semibold text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
                  onClick={() => {
                    setResolved(editLast.resolved)
                    setPatientNameInput(editLast.patientNameInput)
                    setBpSystolic(editLast.bpSystolic)
                    setBpDiastolic(editLast.bpDiastolic)
                    setTemp(editLast.temp)
                    setHr(editLast.hr)
                    setSpo2(editLast.spo2)
                    setPainScale(editLast.painScale)
                    setEditLast(null)
                  }}
                >
                  Edit Last
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex h-full flex-col space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="w-full">
                {resolvedChiefComplaint ? (
                  <div className="mb-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">
                    Chief Complaint: {resolvedChiefComplaint}
                  </div>
                ) : null}
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Patient Name</label>
                <input
                  value={patientNameInput}
                  onChange={(e) => setPatientNameInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-indigo-400/40 bg-indigo-500/10 px-4 py-2.5 text-lg font-bold text-indigo-100"
                  placeholder="Patient Name"
                />
                <p className="mt-1 text-[11px] text-slate-500">Visit {resolved.visitId?.slice(0, 12)}...</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setResolved(null)
                  router.replace(basePath)
                  focusScannerInput()
                }}
                className="shrink-0 text-xs text-rose-400 hover:text-rose-300"
              >
                Scan another
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div>
                <label className="text-xs text-slate-400">BP</label>
                <div className="mt-1 flex h-[46px] items-center rounded-lg border border-slate-700 bg-slate-800 px-2">
                  <input
                    value={bpSystolic}
                    maxLength={3}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 3)
                      setBpSystolic(v)
                      if (v.length >= 3) diastolicRef.current?.focus()
                    }}
                    className="w-full border-0 bg-transparent px-2 py-1 text-base font-bold text-white outline-none"
                    placeholder=""
                  />
                  <span className="px-1 text-2xl font-black text-cyan-300">/</span>
                  <input
                    ref={diastolicRef}
                    value={bpDiastolic}
                    maxLength={3}
                    onChange={(e) => setBpDiastolic(e.target.value.replace(/\D/g, '').slice(0, 3))}
                    className="w-full border-0 bg-transparent px-2 py-1 text-base font-bold text-white outline-none"
                    placeholder=""
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Temp C</label>
                <input
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  className="mt-1 h-[46px] w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-base font-semibold text-white"
                  placeholder="37.0"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">HR</label>
                <input
                  value={hr}
                  onChange={(e) => setHr(e.target.value)}
                  className="mt-1 h-[46px] w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-base font-semibold text-white"
                  placeholder=""
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">SpO2 %</label>
                <input
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                  className="mt-1 h-[46px] w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-base font-semibold text-white"
                  placeholder="98"
                />
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-2.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pain Intensity (1-10)</label>
              <div className="mt-1.5 grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPainScale(n)}
                    className={`rounded-lg border py-1.5 text-sm font-bold transition ${
                      painScale === n
                        ? n <= 3
                          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                          : n <= 6
                            ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                            : 'border-rose-400 bg-rose-500/20 text-rose-200'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            {msg ? <p className={`text-sm ${msg.type === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>{msg.text}</p> : null}
            <div className="flex justify-center gap-2 pt-0.5">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCriticalSave()}
                className="w-full max-w-[220px] rounded-xl bg-rose-500/25 px-4 py-3 text-sm font-bold text-rose-100 ring-1 ring-rose-400/60 hover:bg-rose-500/35 disabled:opacity-50"
              >
                {busy ? 'Submitting...' : 'CRITICAL ALERT'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSave()}
                className="w-full max-w-xl rounded-xl bg-cyan-500/25 px-6 py-3 text-base font-bold text-cyan-100 ring-1 ring-cyan-400/50 hover:bg-cyan-500/35 disabled:opacity-50"
              >
                {busy ? 'Submitting...' : 'Refer'}
              </button>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>

      {manualOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-100">Manual Search</h3>
              <button
                type="button"
                onClick={() => {
                  setManualOpen(false)
                  focusScannerInput()
                }}
                className="rounded p-1 text-slate-400 hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              <input
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  const q = manualQuery.trim()
                  if (!q) return
                  e.preventDefault()
                  setManualOpen(false)
                  void resolveCode(q)
                }}
                placeholder="Type patient ID or name"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 pl-9 pr-3 text-sm text-slate-100 outline-none focus:border-cyan-400"
              />
            </div>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {manualLoading ? <p className="text-sm text-slate-400">Searching...</p> : null}
              {manualError ? <p className="text-sm text-rose-400">{manualError}</p> : null}
              {!manualLoading && !manualError && manualQuery.trim().length >= 2 && manualResults.length === 0 ? (
                <p className="text-sm text-slate-500">No matches.</p>
              ) : null}
              {manualResults.map((p) => (
                  <button
                  key={p.id}
                  type="button"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-left hover:border-cyan-500/40 hover:bg-slate-800"
                  onClick={() => {
                    setManualOpen(false)
                      void resolveCode(
                        typeof p.latestVisitId === 'string' && p.latestVisitId.trim()
                          ? p.latestVisitId
                          : JSON.stringify({ type: 'ZION_PATIENT_BADGE', patientId: p.id })
                      )
                  }}
                >
                  <p className="text-sm font-semibold text-slate-100">
                    {p.firstName} {p.lastName}
                  </p>
                  <p className="text-xs text-slate-400">ID: {p.id}</p>
                  {p.latestVisitId ? <p className="text-xs text-cyan-300">Visit: {p.latestVisitId}</p> : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function ERVitalsStationClient({ basePath }: { basePath: string }) {
  const { logout } = useAuth()
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-950">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-800/80 bg-slate-950/95 px-4 py-3">
        <span className="text-sm font-semibold text-slate-200">ER Vitals Terminal</span>
        <button
          type="button"
          onClick={() => logout()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </header>
      <Suspense fallback={<div className="flex flex-1 items-center justify-center text-slate-500">Loading...</div>}>
        <ERVitalsStationInner basePath={basePath} />
      </Suspense>
    </div>
  )
}
