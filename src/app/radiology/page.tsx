'use client'
// FINAL STABLE VERSION - DO NOT MODIFY WITHOUT EXPLICIT PERMISSION FROM HAWRAA.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import BackButton from '@/components/BackButton'
import { USER_ROLES } from '@/contexts/AuthContext'
import { normalizeExternalImageUrl } from '@/config/demoDiagnosticImageUrls'
import { Image, Printer, X } from 'lucide-react'
// MANDATORY SAFETY CHECK: CONFIRMATION MODAL.

type ImagingTab = 'X-Ray' | 'Ultrasound/Sonar' | 'ECG'
type EcgDepartment = 'ECG'
type ImagingStatus = 'Pending' | 'Completed'

type ImagingRequest = {
  id: string
  tab: ImagingTab
  department: 'Radiology' | 'Sonar' | EcgDepartment
  visitId: string
  patientId: string
  patientName: string
  requestType: string
  status: ImagingStatus
  at: string
  uploadedImage?: string
  /** Auto / device report text (stored before doctor release) */
  notes: string
  /** Saved when technician sends to doctor */
  technicianNotes?: string
  requestedAt: string
}

type LabRequest = {
  at: string
  testType: string
  status: ImagingStatus
  result?: string
  completedAt?: string
  attachmentPath?: string
  technicianNotes?: string
}

type BedRow = {
  visitId: string | null
  patientId: string | null
  patientName: string | null
  labRequests: LabRequest[]
}

const buildImagingRequests = (
  beds: BedRow[],
  tab: ImagingTab,
  department: 'Radiology' | 'Sonar' | EcgDepartment
): ImagingRequest[] =>
  beds.flatMap((bed) =>
    (bed.labRequests || []).map((req) => ({
      id: `${department}-${bed.visitId || 'unknown'}-${req.at}`,
      tab,
      department,
      visitId: bed.visitId || '',
      patientId: bed.patientId || '',
      patientName: bed.patientName || 'Unknown',
      requestType: req.testType || (tab === 'X-Ray' ? 'X-Ray' : tab === 'ECG' ? 'ECG' : 'Ultrasound'),
      status: req.status || 'Pending',
      at: req.at,
      uploadedImage: normalizeExternalImageUrl(req.attachmentPath),
      notes: req.result || '',
      technicianNotes: req.technicianNotes,
      requestedAt: new Date(req.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }))
  )

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Could not read file'))
    r.readAsDataURL(file)
  })
}

export default function RadiologyDashboard() {
  const [activeTab, setActiveTab] = useState<ImagingTab>('X-Ray')
  const [requests, setRequests] = useState<ImagingRequest[]>([])
  const [expandedImageFor, setExpandedImageFor] = useState<ImagingRequest | null>(null)
  const [reviewFor, setReviewFor] = useState<ImagingRequest | null>(null)
  const [reviewTechNotes, setReviewTechNotes] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)
  const [confirmSendFor, setConfirmSendFor] = useState<ImagingRequest | null>(null)
  const [confirmSendBusy, setConfirmSendBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleRequests = useMemo(() => {
    const byType = requests.filter((item) => {
      if (activeTab === 'X-Ray') return item.tab === 'X-Ray'
      if (activeTab === 'Ultrasound/Sonar') return item.tab === 'Ultrasound/Sonar'
      return item.tab === 'ECG'
    })
    return [...byType].sort((a, b) => {
      if (a.status === b.status) return 0
      return a.status === 'Pending' ? -1 : 1
    })
  }, [requests, activeTab])

  const fetchRequests = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError(null)
      const [radiologyRes, sonarRes, ecgRes] = await Promise.all([
        fetch('/api/lab/er-beds?department=Radiology'),
        fetch('/api/lab/er-beds?department=Sonar'),
        fetch('/api/lab/er-beds?department=ECG'),
      ])
      const radiologyBeds = (await radiologyRes.json().catch(() => [])) as BedRow[]
      const sonarBeds = (await sonarRes.json().catch(() => [])) as BedRow[]
      const ecgBeds = (await ecgRes.json().catch(() => [])) as BedRow[]
      const merged = [
        ...buildImagingRequests(Array.isArray(radiologyBeds) ? radiologyBeds : [], 'X-Ray', 'Radiology'),
        ...buildImagingRequests(Array.isArray(sonarBeds) ? sonarBeds : [], 'Ultrasound/Sonar', 'Sonar'),
        ...buildImagingRequests(Array.isArray(ecgBeds) ? ecgBeds : [], 'ECG', 'ECG'),
      ]
      setRequests(merged)
    } catch (_) {
      setError('Failed to load imaging queue.')
      setRequests([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = (new URLSearchParams(window.location.search).get('tab') || '').toLowerCase()
    if (t === 'sonar' || t === 'ultrasound') {
      setActiveTab('Ultrasound/Sonar')
    } else if (t === 'ecg') {
      setActiveTab('ECG')
    }
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // Periodic refresh for queue updates.
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRequests(true)
    }, 30000)
    return () => clearInterval(interval)
  }, [fetchRequests])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const showSuccessToast = (message = 'Result sent to doctor successfully!') => {
    setToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2200)
  }

  const handleUploadResult = async (row: ImagingRequest, file: File) => {
    try {
      const attachmentPath = await readFileAsDataUrl(file)
      const resultRes = await fetch('/api/lab/er-beds/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: row.visitId,
          at: row.at,
          testType: row.requestType,
          result: row.notes || 'Imaging study uploaded.',
          department: row.department,
          attachmentPath,
        }),
      })
      const resultJson = (await resultRes.json().catch(() => ({}))) as { error?: string }
      if (!resultRes.ok) {
        throw new Error(resultJson.error || 'Failed to complete result')
      }
      await fetchRequests(true)
      showSuccessToast('Image saved — review and send to the doctor when ready.')
    } catch (err) {
      setError((err as Error)?.message || 'Failed to upload result')
    }
  }

  const openReviewModal = (row: ImagingRequest) => {
    setReviewFor(row)
    setReviewTechNotes(row.technicianNotes || '')
  }

  const submitReviewToDoctor = async (row: ImagingRequest, techNotes: string) => {
    if (!row?.uploadedImage) return
    setReviewBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/lab/er-beds/release-imaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: row.visitId,
          at: row.at,
          department: row.department,
          technicianNotes: techNotes.trim(),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Failed to send to doctor')
      setReviewFor(null)
      setReviewTechNotes('')
      showSuccessToast()
      await fetchRequests(true)
      if (typeof BroadcastChannel !== 'undefined') {
        new BroadcastChannel('zion-diagnostic').postMessage({
          type: 'imaging-released',
          department: row.department,
        })
      }
    } catch (e) {
      setError((e as Error)?.message || 'Failed to send to doctor')
    } finally {
      setReviewBusy(false)
    }
  }

  // MANDATORY SAFETY CHECK: CONFIRMATION MODAL.
  const requestSendConfirmation = () => {
    if (!reviewFor?.uploadedImage) return
    setConfirmSendFor(reviewFor)
  }

  const confirmSendToDoctor = async () => {
    if (!confirmSendFor) return
    setConfirmSendBusy(true)
    try {
      await submitReviewToDoctor(confirmSendFor, reviewTechNotes)
      setConfirmSendFor(null)
    } finally {
      setConfirmSendBusy(false)
    }
  }

  const escapeHtmlAttr = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const escapeHtmlText = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const handlePrint = (request: ImagingRequest) => {
    const printWindow = window.open('', '_blank', 'width=1024,height=900')
    if (!printWindow) return

    const imgBlock =
      request.uploadedImage &&
      `<img src="${escapeHtmlAttr(request.uploadedImage)}" referrerpolicy="no-referrer" alt="Scan image" />`

    const html = `
      <!doctype html>
      <html>
      <head>
        <title>ZION Imaging Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
          .hospital { font-size: 22px; font-weight: 700; }
          .sub { color: #334155; margin-top: 4px; }
          .meta { margin: 14px 0; line-height: 1.7; }
          img { max-width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; margin: 14px 0; }
          .label { font-weight: 700; }
          .notes { margin-top: 10px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hospital">ZION Hospital</div>
          <div class="sub">Diagnostic Imaging Report</div>
        </div>
        <div class="meta">
          <div><span class="label">Patient Name:</span> ${request.patientName}</div>
          <div><span class="label">Patient ID:</span> ${request.patientId}</div>
          <div><span class="label">Visit ID:</span> ${request.visitId}</div>
          <div><span class="label">Exam:</span> ${request.requestType}</div>
        </div>
        ${imgBlock || ''}
        <div class="notes">
          <div class="label">Study summary</div>
          <div>${escapeHtmlText(request.notes)}</div>
        </div>
        ${
          request.technicianNotes
            ? `<div class="notes" style="margin-top:12px"><div class="label">Technician notes (to doctor)</div><div>${escapeHtmlText(request.technicianNotes)}</div></div>`
            : ''
        }
        <script>
          window.onload = () => {
            window.print();
            window.onafterprint = () => window.close();
          };
        </script>
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.RADIOLOGY_TECH, USER_ROLES.ADMIN]}>
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-6xl mx-auto space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-slate-100">ZION Hospital - Diagnostic Imaging</h1>
                  <p className="text-xs text-slate-400">Radiology and Ultrasound queue</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-2 inline-flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('X-Ray')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === 'X-Ray'
                      ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300'
                      : 'text-slate-300 hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  X-Ray
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('Ultrasound/Sonar')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === 'Ultrasound/Sonar'
                      ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                      : 'text-slate-300 hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  Ultrasound/Sonar
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ECG')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === 'ECG'
                      ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                      : 'text-slate-300 hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  ECG
                </button>
              </div>

              <section className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
                <h2 className="text-sm font-semibold text-slate-300 mb-3">
                  {activeTab} Requests
                </h2>
                {error && (
                  <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    {error}
                  </div>
                )}
                <div className="overflow-x-auto rounded-lg border border-slate-800/40">
                  <table className="w-full min-w-[760px] table-fixed text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-700/70 bg-slate-900/60">
                        <th className="py-3 px-4 font-medium w-[26%]">Patient Name</th>
                        <th className="py-3 px-4 font-medium w-[20%]">Type</th>
                        <th className="py-3 px-4 font-medium w-[11%]">Time</th>
                        <th className="py-3 px-4 font-medium w-[12%]">Status</th>
                        <th className="py-3 px-4 font-medium w-[132px]">Image</th>
                        <th className="py-3 px-4 font-medium text-right w-[28%] min-w-[220px]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-500">
                            Loading imaging queue...
                          </td>
                        </tr>
                      )}
                      {!loading && visibleRequests.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-500">
                            No imaging requests in this tab.
                          </td>
                        </tr>
                      )}
                      {visibleRequests.map((item) => {
                        return (
                          <tr
                            key={item.id}
                            className="border-b border-slate-800/70 align-middle transition-colors hover:bg-slate-800/20"
                          >
                            <td className="py-3 px-4">
                              <div className="text-slate-100 font-medium leading-5 truncate" title={item.patientName}>
                                {item.patientName}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate" title={item.visitId}>
                                {item.visitId}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              <span className="line-clamp-2" title={item.requestType}>
                                {item.requestType}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-300 whitespace-nowrap tabular-nums">
                              {item.requestedAt}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex text-xs px-2.5 py-1 rounded-md font-medium ${
                                  item.status === 'Completed'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 w-[132px]">
                              {item.uploadedImage ? (
                                <button
                                  type="button"
                                  onClick={() => setExpandedImageFor(item)}
                                  className="block rounded-md border border-slate-700/90 overflow-hidden bg-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                                  title="View full size"
                                >
                                  <img
                                    src={item.uploadedImage}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    className="h-14 w-[5.5rem] object-cover block"
                                  />
                                </button>
                              ) : (
                                <div
                                  role="img"
                                  aria-label="No image"
                                  className="flex h-14 w-[5.5rem] items-center justify-center rounded-md border border-slate-700/60 bg-slate-800/40"
                                >
                                  <Image className="h-6 w-6 text-slate-600 shrink-0" strokeWidth={1.25} aria-hidden />
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2 flex-wrap">
                                {item.status === 'Pending' && item.uploadedImage && (
                                  <button
                                    type="button"
                                    onClick={() => openReviewModal(item)}
                                    className="px-2.5 py-1.5 rounded-md bg-sky-500/25 border border-sky-500/45 text-sky-200 text-xs font-medium hover:bg-sky-500/35"
                                  >
                                    Review &amp; Submit
                                  </button>
                                )}
                                {item.status === 'Pending' && !item.uploadedImage && (
                                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                                    <label className="px-2.5 py-1.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30 cursor-pointer inline-block">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="sr-only"
                                        onChange={(e) => {
                                          const f = e.target.files?.[0]
                                          e.target.value = ''
                                          if (f) void handleUploadResult(item, f)
                                        }}
                                      />
                                      Upload image
                                    </label>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handlePrint(item)}
                                  className="px-2.5 py-1.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-medium hover:bg-cyan-500/30 inline-flex items-center gap-1.5"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  Print
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
      {reviewFor && (
        <>
          <div
            className="fixed inset-0 z-[90] bg-black/75"
            aria-hidden
            onClick={() => {
              if (!reviewBusy) {
                setReviewFor(null)
                setReviewTechNotes('')
              }
            }}
          />
          <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="pointer-events-auto max-w-2xl w-full rounded-xl border border-slate-600 bg-slate-900 shadow-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">Review imaging</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {reviewFor.patientName} · {reviewFor.requestType}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={reviewBusy}
                  onClick={() => {
                    setReviewFor(null)
                    setReviewTechNotes('')
                    setConfirmSendFor(null)
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-50"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {reviewFor.uploadedImage ? (
                <img
                  src={reviewFor.uploadedImage}
                  alt={`${reviewFor.requestType} preview`}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-[min(50vh,480px)] object-contain rounded-lg border border-slate-700 bg-slate-950"
                />
              ) : null}
              <div>
                <p className="text-xs text-slate-500 mb-1">Study summary (from device)</p>
                <p className="text-sm text-slate-300 rounded-lg bg-slate-800/80 border border-slate-700 p-3 whitespace-pre-wrap">
                  {reviewFor.notes || '—'}
                </p>
              </div>
              <div>
                <label htmlFor="review-tech-notes" className="block text-sm font-medium text-slate-300 mb-1">
                  Technician notes
                </label>
                <textarea
                  id="review-tech-notes"
                  value={reviewTechNotes}
                  onChange={(e) => setReviewTechNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100 text-sm placeholder:text-slate-500"
                  placeholder="Notes visible to the doctor after you send…"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={reviewBusy}
                  onClick={() => {
                    setReviewFor(null)
                    setReviewTechNotes('')
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={reviewBusy}
                  onClick={requestSendConfirmation}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  {reviewBusy ? 'Sending…' : 'Send to Doctor'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      {toast && (
        <div className="fixed top-4 right-4 z-[80] rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-xs text-emerald-200 shadow-lg">
          {toast}
        </div>
      )}
      {confirmSendFor && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-emerald-500/35 bg-slate-900/95 p-5 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
            <h3 className="text-base font-semibold text-slate-100">
              Confirm Final Results -{' '}
              {confirmSendFor.department === 'Sonar'
                ? 'Sonar'
                : confirmSendFor.department === 'ECG'
                  ? 'ECG'
                  : 'Radiology'}
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              Are you sure you want to finalize these results for <span className="font-semibold">{confirmSendFor.patientName}</span>? This will send the data directly to the doctor&apos;s dashboard.
            </p>
            <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-950/40 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Result Summary</p>
              <div className="overflow-hidden rounded-lg border border-slate-700/60">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-slate-700/60">
                      <td className="px-3 py-2 text-slate-400">Patient</td>
                      <td className="px-3 py-2 text-slate-100">{confirmSendFor.patientName}</td>
                    </tr>
                    <tr className="border-b border-slate-700/60">
                      <td className="px-3 py-2 text-slate-400">Exam Type</td>
                      <td className="px-3 py-2 text-slate-100">{confirmSendFor.requestType}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-slate-400">Result Summary</td>
                      <td className="px-3 py-2 text-slate-100">{confirmSendFor.notes || '(Image attached)'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="confirm-tech-notes" className="mb-1 block text-sm font-medium text-slate-300">
                Technician Notes / Observations
              </label>
              <textarea
                id="confirm-tech-notes"
                value={reviewTechNotes}
                onChange={(e) => setReviewTechNotes(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none"
                placeholder="Add any notes or clinical observations here (optional)..."
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={confirmSendBusy || reviewBusy}
                onClick={() => setConfirmSendFor(null)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel / Edit
              </button>
              <button
                type="button"
                disabled={confirmSendBusy || reviewBusy}
                onClick={() => void confirmSendToDoctor()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 hover:shadow-[0_0_16px_rgba(16,185,129,0.45)] disabled:opacity-50"
              >
                {confirmSendBusy || reviewBusy ? 'Sending…' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}
      {expandedImageFor && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70"
            onClick={() => setExpandedImageFor(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative max-w-4xl w-full rounded-xl border border-slate-700 bg-slate-900 p-3">
              <button
                type="button"
                onClick={() => setExpandedImageFor(null)}
                className="absolute right-3 top-3 p-1.5 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-sm text-slate-300 mb-2 pr-10">
                {expandedImageFor.patientName} - {expandedImageFor.requestType}
              </p>
              <img
                src={expandedImageFor.uploadedImage || 'https://via.placeholder.com/1200x800?text=No+Image'}
                alt={`${expandedImageFor.requestType} expanded`}
                referrerPolicy="no-referrer"
                className="w-full max-h-[75vh] object-contain rounded-lg border border-slate-700 bg-slate-950"
              />
            </div>
          </div>
        </>
      )}
      <BackButton />
    </ProtectedRoute>
  )
}
