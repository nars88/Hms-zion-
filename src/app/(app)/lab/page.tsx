'use client'
// FINAL STABLE VERSION - DO NOT MODIFY WITHOUT EXPLICIT PERMISSION FROM HAWRAA.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import BackButton from '@/components/BackButton'
import { USER_ROLES } from '@/contexts/AuthContext'
import {
  enableDiagnosticUiSim,
  getDiagnosticSimLabBedRows,
  isDiagnosticUiSimEnabled,
  isSimVisitId,
  readSimulationFlagFromUrl,
} from '@/lib/diagnosticUiSim'
import { Plus, Printer, Send } from 'lucide-react'
// MANDATORY SAFETY CHECK: CONFIRMATION MODAL.

type LabRequest = {
  id: string
  at: string
  visitId: string
  patientId: string
  patientName: string
  testType: string
  status: 'PENDING' | 'IN_PROGRESS' | 'SAMPLE_COLLECTED' | 'COMPLETED'
  result?: string
  completedAt?: string
  releasedToDoctorAt?: string
}

type ApiLabRequest = {
  at: string
  testType: string
  status: 'PENDING' | 'IN_PROGRESS' | 'SAMPLE_COLLECTED' | 'COMPLETED'
  result?: string
  completedAt?: string
  releasedToDoctorAt?: string
}

type BedRow = {
  visitId: string | null
  patientId: string | null
  patientName: string | null
  labRequests: ApiLabRequest[]
}

export default function LabTechDashboard() {
  const [requests, setRequests] = useState<LabRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'queue' | 'results'>('queue')
  const [sendingKey, setSendingKey] = useState<string | null>(null)
  const [confirmRow, setConfirmRow] = useState<LabRequest | null>(null)
  const [confirmFile, setConfirmFile] = useState<File | null>(null)
  const [confirmResultText, setConfirmResultText] = useState('')
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [confirmNotes, setConfirmNotes] = useState('')
  const [simUiActive, setSimUiActive] = useState(false)
  /** Sim rows: reflect SAMPLE_COLLECTED locally (no DB). */
  const [labSimSampleCollectedIds, setLabSimSampleCollectedIds] = useState<Set<string>>(() => new Set())
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const queueRequests = useMemo(
    () => requests.filter((r) => r.status === 'PENDING'),
    [requests]
  )
  const completedRequests = useMemo(
    () =>
      requests.filter(
        (r) => (r.status === 'IN_PROGRESS' || r.status === 'COMPLETED') && !r.releasedToDoctorAt
      ),
    [requests]
  )
  const unreleasedResultsCount = useMemo(
    () => completedRequests.filter((r) => !r.releasedToDoctorAt).length,
    [completedRequests]
  )

  /** Pending queue with client-side sim overrides (start -> in progress). */
  const labPendingDisplayRows = useMemo(
    () =>
      queueRequests.map((r) =>
        labSimSampleCollectedIds.has(r.id) ? { ...r, status: 'IN_PROGRESS' as const } : r
      ),
    [queueRequests, labSimSampleCollectedIds]
  )

  const mapBedsToRequests = useCallback((beds: BedRow[]) => {
    return beds.flatMap((bed) =>
      (bed.labRequests || []).map((r) => ({
        id: `LAB-${bed.visitId || 'unknown'}-${r.at}`,
        at: r.at,
        visitId: bed.visitId || '',
        patientId: bed.patientId || '',
        patientName: bed.patientName || 'Unknown',
        testType: r.testType || 'Lab Test',
        status: r.status || 'PENDING',
        result: r.result,
        completedAt: r.completedAt,
        releasedToDoctorAt: r.releasedToDoctorAt,
      }))
    )
  }, [])

  const fetchRequests = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError(null)
      const res = await fetch(`/api/lab/er-beds?department=Lab`)
      const data = res.ok ? await res.json() : []
      console.log('[Lab Dashboard] raw beds payload:', data)
      const mapped = mapBedsToRequests(Array.isArray(data) ? data : [])
      console.log('[Lab Dashboard] mapped requests:', mapped)
      const simRows = isDiagnosticUiSimEnabled() ? mapBedsToRequests(getDiagnosticSimLabBedRows()) : []
      setRequests([...simRows, ...mapped])
    } catch (_) {
      setError('Failed to load lab queue.')
      setRequests([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [mapBedsToRequests])

  useEffect(() => {
    readSimulationFlagFromUrl()
    setSimUiActive(isDiagnosticUiSimEnabled())
    fetchRequests()
  }, [fetchRequests])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchRequests(true)
    }, 10000)
    return () => window.clearInterval(intervalId)
  }, [fetchRequests])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const channel = new BroadcastChannel('zion-diagnostic')
    channel.onmessage = (event: MessageEvent) => {
      const type = (event.data as { type?: string } | undefined)?.type
      if (type === 'diagnostic-requested') {
        void fetchRequests(true)
      }
    }
    return () => channel.close()
  }, [fetchRequests])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const showSuccessToast = () => {
    setToast('Result sent to doctor successfully!')
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2200)
  }

  const showToastMessage = (message: string) => {
    setToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2200)
  }

  const patchLabOrderStatus = useCallback(
    async (row: LabRequest, kind: 'IN_PROGRESS' | 'COMPLETED') => {
      if (isSimVisitId(row.visitId)) {
        if (kind === 'IN_PROGRESS') {
          setLabSimSampleCollectedIds((prev) => new Set(prev).add(row.id))
        }
        showToastMessage(
          kind === 'IN_PROGRESS'
            ? 'Simulation: procedure started.'
            : 'Simulation: order updated.'
        )
        return
      }
      const res = await fetch('/api/lab/er-beds/order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: row.visitId, at: row.at, kind }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Failed to update request status')
      await fetchRequests(true)
    },
    [fetchRequests]
  )

  const handleUploadLabResult = async (
    row: LabRequest,
    options: { file?: File | null; resultText?: string; technicianNotes?: string }
  ) => {
    if (isSimVisitId(row.visitId)) {
      setError('Simulation row — not saved. Refresh removes all mock data.')
      return
    }
    try {
      const file = options.file || null
      const manualText = (options.resultText || '').trim()
      let resultText = manualText
      let attachmentPath: string | undefined

      if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
        attachmentPath = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(new Error('Could not read file'))
          reader.readAsDataURL(file)
        })
        if (!resultText) resultText = `Lab result uploaded: ${file.name}`
      } else if (file) {
        resultText = await file.text()
        if (!resultText.trim()) {
          setError('File is empty')
          return
        }
      }

      if (!resultText.trim() && !attachmentPath) {
        setError('Please enter result text or upload a file')
        return
      }

      setRequests((prev) =>
        prev.map((item) =>
          item.id === row.id
            ? {
                ...item,
                status: 'COMPLETED',
                result: resultText || item.result,
              }
            : item
        )
      )
      setActiveTab('results')

      const res = await fetch('/api/lab/er-beds/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: row.visitId,
          at: row.at,
          testType: row.testType,
          result: resultText,
          department: 'Lab',
          attachmentPath,
          technicianNotes: options.technicianNotes?.trim() || undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Failed to save result')

      showSuccessToast()
    } catch (err) {
      await fetchRequests(true)
      setError((err as Error)?.message || 'Failed to upload result')
    }
  }

  const handleSendToDoctor = async (row: LabRequest) => {
    if (isSimVisitId(row.visitId)) {
      setError('Simulation row — not sent. Refresh removes all mock data.')
      return
    }
    const key = `${row.visitId}-${row.at}`
    if (sendingKey === key || row.releasedToDoctorAt) return
    try {
      setSendingKey(key)
      const res = await fetch('/api/lab/er-beds/release-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: row.visitId, at: row.at }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; alreadyReleased?: boolean }
      if (!res.ok) throw new Error(data.error || 'Failed to send to doctor')
      setRequests((prev) => prev.filter((item) => item.id !== row.id))
      showToastMessage(data.alreadyReleased ? 'Already sent to doctor' : 'Sent to doctor successfully')
      await fetchRequests(true)
      if (typeof BroadcastChannel !== 'undefined') {
        new BroadcastChannel('zion-diagnostic').postMessage({ type: 'lab-released' })
      }
    } catch (err) {
      setError((err as Error)?.message || 'Failed to send result to doctor')
    } finally {
      setSendingKey(null)
    }
  }

  // MANDATORY SAFETY CHECK: CONFIRMATION MODAL.
  const confirmFinalize = async () => {
    if (!confirmRow) return
    setConfirmBusy(true)
    try {
      await handleUploadLabResult(confirmRow, {
        file: confirmFile,
        resultText: confirmResultText,
        technicianNotes: confirmNotes,
      })
      setConfirmRow(null)
      setConfirmFile(null)
      setConfirmResultText('')
      setConfirmNotes('')
    } finally {
      setConfirmBusy(false)
    }
  }

  const openLabFindingsModal = (row: LabRequest) => {
    setConfirmRow(row)
    setConfirmFile(null)
    setConfirmResultText('')
    setConfirmNotes('')
  }

  const handleCollectSample = async (row: LabRequest) => {
    if (row.status === 'IN_PROGRESS') return
    setError(null)
    try {
      await patchLabOrderStatus(row, 'IN_PROGRESS')
      showToastMessage('Procedure started — moved to Results tab.')
      setActiveTab('results')
    } catch (e) {
      setError((e as Error)?.message || 'Failed to start procedure')
    }
  }

  const handlePrint = (row: LabRequest) => {
    const printWindow = window.open('', '_blank', 'width=980,height=900')
    if (!printWindow) return
    const html = `
      <!doctype html>
      <html>
      <head>
        <title>ZION Lab Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
          .hospital { font-size: 22px; font-weight: 700; }
          .sub { color: #334155; margin-top: 4px; }
          .meta { margin: 14px 0; line-height: 1.7; }
          .result { margin-top: 10px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hospital">ZION Hospital</div>
          <div class="sub">Laboratory Result</div>
        </div>
        <div class="meta">
          <div><strong>Patient:</strong> ${row.patientName}</div>
          <div><strong>Patient ID:</strong> ${row.patientId}</div>
          <div><strong>Visit ID:</strong> ${row.visitId}</div>
          <div><strong>Test:</strong> ${row.testType}</div>
        </div>
        <div class="result">${row.result || '—'}</div>
        <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
      </body>
      </html>
    `
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.LAB_TECH, USER_ROLES.ADMIN]}>
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-auto px-3 py-1">
            <div className="max-w-7xl mx-auto space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-2xl border border-cyan-500/25 bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-slate-900/95 p-1.5 shadow-[0_10px_30px_rgba(3,7,18,0.45)]">
                    <button
                      type="button"
                      onClick={() => setActiveTab('queue')}
                      className={`rounded-xl px-5 py-2.5 text-sm font-bold tracking-wide transition-all duration-200 ${
                        activeTab === 'queue'
                          ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/25 text-cyan-100 shadow-[0_0_28px_rgba(6,182,212,0.35)] border border-cyan-400/40'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                      }`}
                    >
                      Requests
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('results')}
                      className={`rounded-xl px-5 py-2.5 text-sm font-bold tracking-wide transition-all duration-200 ${
                        activeTab === 'results'
                          ? 'bg-gradient-to-r from-emerald-500/30 to-cyan-500/25 text-emerald-100 shadow-[0_0_28px_rgba(16,185,129,0.35)] border border-emerald-400/40'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        Results
                        {unreleasedResultsCount > 0 ? (
                          <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-red-500 px-1.5 py-0.5 text-[11px] font-extrabold leading-none text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]">
                            {unreleasedResultsCount}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </div>
                  {simUiActive ? (
                    <span className="text-[10px] text-amber-200/90 border border-amber-500/30 rounded px-2 py-0.5">
                      Sim · refresh clears
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        enableDiagnosticUiSim()
                        setSimUiActive(true)
                        void fetchRequests(false)
                      }}
                      className="rounded-md border border-cyan-500/35 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-100 hover:bg-cyan-500/20"
                    >
                      Load lab simulation
                    </button>
                  )}
                </div>
                <section className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-1.5">
                {error && (
                  <div className="mb-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-xs text-rose-300">
                    {error}
                  </div>
                )}
                {activeTab === 'results' ? (
                  <div className="min-w-0">
                    {loading && (
                      <div className="py-8 text-center text-sm text-slate-500">Loading lab queue...</div>
                    )}
                    {!loading && completedRequests.length === 0 && (
                      <div className="py-8 text-center text-sm text-slate-500">No completed results yet.</div>
                    )}
                    {!loading && completedRequests.length > 0 && (
                      <div className="flex flex-col gap-3">
                        {completedRequests.map((row) => {
                          const completedTime = new Date(row.completedAt || row.at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                          const statusLabel =
                            row.status === 'COMPLETED'
                              ? row.releasedToDoctorAt
                                ? 'SENT'
                                : 'COMPLETED'
                              : row.status
                          const statusClass =
                            row.status === 'COMPLETED'
                              ? row.releasedToDoctorAt
                                ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/35'
                                : 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/35'
                              : 'bg-amber-500/20 text-amber-200 border border-amber-500/35'
                          const actionBar =
                            'inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors'
                          return (
                            <div
                              key={row.id}
                              className="rounded-lg border border-slate-800/80 bg-slate-900/55 px-4 py-3 shadow-sm transition-colors hover:bg-slate-900/70"
                            >
                              <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(0,1.1fr)]">
                                <div className="min-w-0">
                                  <div className="text-slate-100 font-medium leading-5 truncate" title={row.patientName}>
                                    {row.patientName}
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate" title={row.visitId}>
                                    {row.visitId}
                                  </div>
                                </div>
                                <div className="min-w-0 text-sm text-slate-300">
                                  <span className="line-clamp-2" title={row.testType}>
                                    {row.testType}
                                  </span>
                                </div>
                                <div className="min-w-0 text-xs lg:text-right" title={row.result || undefined}>
                                  <span className="text-slate-600">Preview</span>
                                  <p className="mt-0.5 truncate text-slate-300">{row.result || '—'}</p>
                                </div>
                              </div>
                              <div className="mt-3 flex flex-col gap-4 border-t border-slate-800/60 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-300 shrink-0">
                                  <span className="tabular-nums text-slate-200">{completedTime}</span>
                                  <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${statusClass}`}>
                                    {statusLabel}
                                  </span>
                                </div>
                                <div className="flex flex-nowrap items-center justify-end gap-3 min-w-0 sm:ml-auto">
                                  {row.releasedToDoctorAt ? (
                                    <span
                                      className={`${actionBar} cursor-not-allowed border border-slate-600/80 bg-slate-800/30 text-slate-500`}
                                    >
                                      <Plus className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
                                      Attach Result
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => openLabFindingsModal(row)}
                                      className={`${actionBar} border border-emerald-500/35 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15`}
                                    >
                                      <Plus className="h-4 w-4 shrink-0" aria-hidden />
                                      Attach Result
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={Boolean(row.releasedToDoctorAt) || sendingKey === `${row.visitId}-${row.at}`}
                                    onClick={() => handleSendToDoctor(row)}
                                    className={`${actionBar} font-semibold border shadow-sm ${
                                      row.releasedToDoctorAt
                                        ? 'cursor-not-allowed border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                                        : 'border-blue-600/80 bg-blue-600 text-white hover:bg-blue-500 disabled:pointer-events-none disabled:opacity-70'
                                    }`}
                                  >
                                    <Send className="h-4 w-4 shrink-0" aria-hidden />
                                    {row.releasedToDoctorAt
                                      ? 'Sent'
                                      : sendingKey === `${row.visitId}-${row.at}`
                                        ? 'Sending...'
                                        : 'Send to Doctor'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handlePrint(row)}
                                    className={`${actionBar} border border-slate-600 bg-slate-800/50 text-slate-200 hover:bg-slate-700/70`}
                                  >
                                    <Printer className="h-4 w-4 shrink-0" aria-hidden />
                                    Print
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="min-w-0">
                    {loading && (
                      <div className="py-8 text-center text-sm text-slate-500">Loading lab queue...</div>
                    )}
                    {!loading && labPendingDisplayRows.length === 0 && (
                      <div className="py-8 text-center text-sm text-slate-500">No active lab requests.</div>
                    )}
                    {!loading && labPendingDisplayRows.length > 0 && (
                      <div className="flex flex-col gap-3">
                        {labPendingDisplayRows.map((row) => {
                          const t = new Date(row.completedAt || row.at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                          const inProg = row.status === 'IN_PROGRESS'
                          const statusBadge = inProg ? (
                            <span className="inline-flex items-center rounded-md border border-blue-500/35 bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-200">
                              In progress
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md border border-amber-500/35 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-200">
                              Pending
                            </span>
                          )
                          return (
                            <div
                              key={row.id}
                              className="rounded-lg border border-slate-800/80 bg-slate-900/55 px-4 py-3 shadow-sm transition-colors hover:bg-slate-900/70"
                            >
                              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center">
                                <div className="min-w-0">
                                  <div className="font-medium leading-5 text-slate-100">{row.patientName}</div>
                                  <div className="text-[11px] text-slate-500">{row.visitId}</div>
                                </div>
                                <div className="min-w-0 text-sm text-slate-300">
                                  <span className="line-clamp-2" title={row.testType}>
                                    {row.testType}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:justify-end">{statusBadge}</div>
                              </div>
                              <div className="mt-3 flex flex-col gap-3 border-t border-slate-800/60 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                                <span className="tabular-nums text-sm text-slate-300">{t}</span>
                                <div className="flex flex-nowrap items-center justify-end gap-3 sm:ml-auto">
                                  <button
                                    type="button"
                                    disabled={inProg}
                                    onClick={() => void handleCollectSample(row)}
                                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-400/50 bg-gradient-to-r from-amber-500/30 to-blue-600/50 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:from-amber-500/45 hover:to-blue-600/65 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    Collect Sample
                                  </button>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
      {toast && (
        <div className="fixed top-4 right-4 z-[80] rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-xs text-emerald-200 shadow-lg">
          {toast}
        </div>
      )}
      {confirmRow && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-emerald-500/35 bg-slate-900/95 p-5 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
            <h3 className="text-base font-semibold text-slate-100">
              Confirm Final Results - Laboratory
              {confirmFile ? (
                <span className="block mt-1 text-sm font-normal text-slate-400 truncate" title={confirmFile.name}>
                  {confirmFile.name}
                </span>
              ) : null}
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              Are you sure you want to finalize these results for <span className="font-semibold">{confirmRow.patientName}</span>? This will send the data directly to the doctor&apos;s dashboard.
            </p>
            <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-950/40 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Result Summary</p>
              <div className="overflow-hidden rounded-lg border border-slate-700/60">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-slate-700/60">
                      <td className="px-3 py-2 text-slate-400">Patient</td>
                      <td className="px-3 py-2 text-slate-100">{confirmRow.patientName}</td>
                    </tr>
                    <tr className="border-b border-slate-700/60">
                      <td className="px-3 py-2 text-slate-400">Test Name</td>
                      <td className="px-3 py-2 text-slate-100">{confirmRow.testType}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-slate-400">Result</td>
                      <td className="px-3 py-2 text-slate-100">{confirmFile?.name ?? '—'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="lab-confirm-notes" className="mb-1 block text-sm font-medium text-slate-300">
                Technician Notes / Observations
              </label>
              <label htmlFor="lab-confirm-result" className="mb-1 mt-3 block text-sm font-medium text-slate-300">
                Result Text (Manual Entry)
              </label>
              <textarea
                id="lab-confirm-result"
                rows={3}
                value={confirmResultText}
                onChange={(e) => setConfirmResultText(e.target.value)}
                className="w-full rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none"
                placeholder="Type result summary manually (optional if file is uploaded)..."
              />
              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium text-slate-300">Upload File (PDF/Image)</label>
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/25">
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null
                      e.target.value = ''
                      setConfirmFile(f)
                    }}
                  />
                  {confirmFile ? `Selected: ${confirmFile.name}` : 'Choose PDF/Image'}
                </label>
              </div>
              <textarea
                id="lab-confirm-notes"
                rows={4}
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none"
                placeholder="Add any notes or clinical observations here (optional)..."
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={confirmBusy}
                onClick={() => {
                  setConfirmRow(null)
                  setConfirmFile(null)
                  setConfirmResultText('')
                  setConfirmNotes('')
                }}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel / Edit
              </button>
              <button
                type="button"
                disabled={confirmBusy}
                onClick={() => void confirmFinalize()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 hover:shadow-[0_0_16px_rgba(16,185,129,0.45)] disabled:opacity-50"
              >
                {confirmBusy ? 'Sending…' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}
      <BackButton />
    </ProtectedRoute>
  )
}
