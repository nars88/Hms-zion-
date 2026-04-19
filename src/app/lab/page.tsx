'use client'
// FINAL STABLE VERSION - DO NOT MODIFY WITHOUT EXPLICIT PERMISSION FROM HAWRAA.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import BackButton from '@/components/BackButton'
import { USER_ROLES } from '@/contexts/AuthContext'
import { Printer } from 'lucide-react'
// MANDATORY SAFETY CHECK: CONFIRMATION MODAL.

type LabRequest = {
  id: string
  at: string
  visitId: string
  patientId: string
  patientName: string
  testType: string
  status: 'Pending' | 'Completed'
  result?: string
  completedAt?: string
}

type ApiLabRequest = {
  at: string
  testType: string
  status: 'Pending' | 'Completed'
  result?: string
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
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmRow, setConfirmRow] = useState<LabRequest | null>(null)
  const [confirmFile, setConfirmFile] = useState<File | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [confirmNotes, setConfirmNotes] = useState('')
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleRequests = useMemo(() => requests, [requests])

  const mapBedsToRequests = useCallback((beds: BedRow[]) => {
    return beds.flatMap((bed) =>
      (bed.labRequests || []).map((r) => ({
        id: `LAB-${bed.visitId || 'unknown'}-${r.at}`,
        at: r.at,
        visitId: bed.visitId || '',
        patientId: bed.patientId || '',
        patientName: bed.patientName || 'Unknown',
        testType: r.testType || 'Lab Test',
        status: r.status || 'Pending',
        result: r.result,
      }))
    )
  }, [])

  const fetchRequests = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError(null)
      const res = await fetch(`/api/lab/er-beds?department=Lab`)
      const data = res.ok ? await res.json() : []
      const mapped = mapBedsToRequests(Array.isArray(data) ? data : [])
      setRequests(mapped)
    } catch (_) {
      setError('Failed to load lab queue.')
      setRequests([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [mapBedsToRequests])

  useEffect(() => {
    fetchRequests()
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

  const removeRowWithAnimation = (id: string) => {
    setRemovingIds((prev) => new Set(prev).add(id))
    setTimeout(() => {
      setRequests((prev) => prev.filter((r) => r.id !== id))
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 220)
  }

  const handleUploadLabResult = async (row: LabRequest, file: File, technicianNotes?: string) => {
    try {
      let resultText = ''
      let attachmentPath: string | undefined

      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        attachmentPath = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(new Error('Could not read file'))
          reader.readAsDataURL(file)
        })
        resultText = `Lab result uploaded: ${file.name}`
      } else {
        resultText = await file.text()
        if (!resultText.trim()) {
          setError('File is empty')
          return
        }
      }

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
          technicianNotes: technicianNotes?.trim() || undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Failed to save result')

      showSuccessToast()
      removeRowWithAnimation(row.id)
      await fetchRequests(true)
    } catch (err) {
      setError((err as Error)?.message || 'Failed to upload result')
    }
  }

  // MANDATORY SAFETY CHECK: CONFIRMATION MODAL.
  const confirmFinalize = async () => {
    if (!confirmRow || !confirmFile) return
    setConfirmBusy(true)
    try {
      await handleUploadLabResult(confirmRow, confirmFile, confirmNotes)
      setConfirmRow(null)
      setConfirmFile(null)
      setConfirmNotes('')
    } finally {
      setConfirmBusy(false)
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
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-6xl mx-auto space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-slate-100">ZION Hospital - Laboratory</h1>
                  <p className="text-xs text-slate-400">Compact pending lab queue</p>
                </div>
              </div>

              <section className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
                <h2 className="text-sm font-semibold text-slate-300 mb-3">Pending Tests</h2>
                {error && (
                  <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    {error}
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-700/70">
                        <th className="py-2 px-2 font-medium">Patient Name</th>
                        <th className="py-2 px-2 font-medium">Type</th>
                        <th className="py-2 px-2 font-medium">Time</th>
                        <th className="py-2 px-2 font-medium">Status</th>
                        <th className="py-2 px-2 font-medium">Result Preview</th>
                        <th className="py-2 px-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr><td colSpan={6} className="py-8 text-center text-slate-500">Loading lab queue...</td></tr>
                      )}
                      {!loading && visibleRequests.length === 0 && (
                        <tr><td colSpan={6} className="py-8 text-center text-slate-500">No pending lab requests.</td></tr>
                      )}
                      {visibleRequests.map((row) => (
                        <tr
                          key={row.id}
                          className={`border-b border-slate-800/70 transition-all duration-200 ${
                            removingIds.has(row.id) ? 'opacity-0 -translate-x-2' : 'opacity-100'
                          }`}
                        >
                          <td className="py-2 px-2">
                            <div className="text-slate-100 font-medium leading-5">{row.patientName}</div>
                            <div className="text-[11px] text-slate-500">{row.visitId}</div>
                          </td>
                          <td className="py-2 px-2 text-slate-300">{row.testType}</td>
                          <td className="py-2 px-2 text-slate-300 whitespace-nowrap">
                            {new Date(row.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2 px-2">
                            <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-300">{row.status}</span>
                          </td>
                          <td className="py-2 px-2 text-xs text-slate-400 truncate max-w-[320px]">
                            {row.result || '—'}
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center justify-end gap-2">
                              <label className="px-2.5 py-1.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30 cursor-pointer inline-block">
                                <input
                                  type="file"
                                  accept=".txt,.csv,.pdf,image/*"
                                  className="sr-only"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0]
                                    e.target.value = ''
                                    if (f) {
                                      setConfirmFile(f)
                                      setConfirmRow(row)
                                      setConfirmNotes('')
                                    }
                                  }}
                                />
                                Upload Result
                              </label>
                              <button
                                type="button"
                                onClick={() => handlePrint(row)}
                                className="px-2.5 py-1.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-medium hover:bg-cyan-500/30 inline-flex items-center gap-1.5"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                Print
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
          <div className="w-full max-w-xl rounded-2xl border border-emerald-500/35 bg-slate-900/95 p-5 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
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
