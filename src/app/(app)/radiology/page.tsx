'use client'
// FINAL STABLE VERSION - DO NOT MODIFY WITHOUT EXPLICIT PERMISSION FROM HAWRAA.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import BackButton from '@/components/BackButton'
import { USER_ROLES } from '@/contexts/AuthContext'
import { DEMO_RADIOLOGY_XRAY_IMAGE_URL, normalizeExternalImageUrl } from '@/config/demoDiagnosticImageUrls'
import {
  DIAGNOSTIC_UI_SIM_PREFIX,
  enableDiagnosticUiSim,
  getDiagnosticSimRadiologyBedRows,
  isDiagnosticUiSimEnabled,
  isSimVisitId,
  readSimulationFlagFromUrl,
} from '@/lib/diagnosticUiSim'
import { Plus, Printer, Send } from 'lucide-react'
// MANDATORY SAFETY CHECK: CONFIRMATION MODAL.

type ImagingTab = 'X-Ray' | 'Ultrasound/Sonar' | 'ECG'
type EcgDepartment = 'ECG'
type ImagingStatus = 'Pending' | 'In Progress' | 'Completed'

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
  /** Present when result was released to the doctor (imaging workflow). */
  releasedToDoctorAt?: string
}

type LabRequest = {
  at: string
  testType: string
  status: ImagingStatus
  result?: string
  completedAt?: string
  attachmentPath?: string
  technicianNotes?: string
  releasedToDoctorAt?: string
}

type BedRow = {
  visitId: string | null
  patientId: string | null
  patientName: string | null
  labRequests: LabRequest[]
}

function normalizeImagingUiStatus(raw: string | undefined): ImagingStatus {
  const u = String(raw || '').toUpperCase()
  if (u === 'COMPLETED' || u === 'COMPLETE') return 'Completed'
  if (u === 'IN_PROGRESS' || u === 'IN PROGRESS') return 'In Progress'
  return 'Pending'
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
      status: normalizeImagingUiStatus(req.status),
      at: req.at,
      uploadedImage: normalizeExternalImageUrl(req.attachmentPath),
      notes: req.result || '',
      technicianNotes: req.technicianNotes,
      requestedAt: new Date(req.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      releasedToDoctorAt:
        typeof req.releasedToDoctorAt === 'string' && req.releasedToDoctorAt.trim()
          ? req.releasedToDoctorAt.trim()
          : undefined,
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

/** Client-only layout mocks (never persisted). Visit IDs use sim prefix — no DB calls. */
const RAD_LAYOUT_MOCK_TAG = 'rad-layout-mock'

function isRadLayoutMock(row: ImagingRequest) {
  return Boolean(row.visitId?.includes(RAD_LAYOUT_MOCK_TAG))
}

function buildRadUiMockPending(): ImagingRequest[] {
  const rows: Array<{ name: string; test: string; hoursAgo: number }> = [
    { name: 'Amina Khalid', test: 'Chest PA — follow-up', hoursAgo: 5 },
    { name: 'Bassem Haddad', test: 'Portable CXR', hoursAgo: 4 },
    { name: 'Layla Mansour', test: 'Ribs series (post-trauma)', hoursAgo: 3 },
    { name: 'Karim Fadel', test: 'Chest X-Ray (ZION mock)', hoursAgo: 2 },
  ]
  return rows.map((r, i) => {
    const at = new Date(Date.now() - r.hoursAgo * 60 * 60_000).toISOString()
    const visitId = `${DIAGNOSTIC_UI_SIM_PREFIX}${RAD_LAYOUT_MOCK_TAG}-pend-${i}`
    return {
      id: `rad-ui-mock-pending-${i}`,
      tab: 'X-Ray' as const,
      department: 'Radiology' as const,
      visitId,
      patientId: `${DIAGNOSTIC_UI_SIM_PREFIX}pat-pend-${i}`,
      patientName: r.name,
      requestType: r.test,
      status: 'Pending' as const,
      at,
      notes: 'UI mock — not saved.',
      requestedAt: new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  })
}

function buildRadUiMockCompleted(): ImagingRequest[] {
  const rows: Array<{ name: string; test: string; hoursAgo: number; withImage: boolean }> = [
    { name: 'Zahra Ahmed Ali', test: 'Chest X-Ray - Follow-up', hoursAgo: 6, withImage: true },
    { name: 'Marwan Ahmed', test: 'Chest X-Ray (PA / lateral)', hoursAgo: 5, withImage: true },
    { name: 'Nour Ali (mock)', test: 'CT correlation scout', hoursAgo: 4, withImage: false },
    { name: 'Omar Hassan (mock)', test: 'Full chest series', hoursAgo: 3, withImage: false },
  ]
  return rows.map((r, i) => {
    const at = new Date(Date.now() - r.hoursAgo * 60 * 60_000).toISOString()
    const visitId = `${DIAGNOSTIC_UI_SIM_PREFIX}${RAD_LAYOUT_MOCK_TAG}-done-${i}`
    return {
      id: `rad-ui-mock-completed-${i}`,
      tab: 'X-Ray' as const,
      department: 'Radiology' as const,
      visitId,
      patientId: `${DIAGNOSTIC_UI_SIM_PREFIX}pat-done-${i}`,
      patientName: r.name,
      requestType: r.test,
      status: 'Completed' as const,
      at,
      uploadedImage: r.withImage ? normalizeExternalImageUrl(DEMO_RADIOLOGY_XRAY_IMAGE_URL) : undefined,
      notes: 'UI mock completed row — not saved.',
      requestedAt: new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  })
}

export default function RadiologyDashboard() {
  const [activeTab, setActiveTab] = useState<ImagingTab>('X-Ray')
  const [imagingSubTab, setImagingSubTab] = useState<'requests' | 'results'>('requests')
  const [requests, setRequests] = useState<ImagingRequest[]>([])
  const [reviewBusy, setReviewBusy] = useState(false)
  const [finalizeFor, setFinalizeFor] = useState<ImagingRequest | null>(null)
  const [finalizeFile, setFinalizeFile] = useState<File | null>(null)
  const [finalizeNotes, setFinalizeNotes] = useState('')
  const [finalizeBusy, setFinalizeBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [simUiActive, setSimUiActive] = useState(false)
  /** X-Ray client-only layout mocks (4 pending + 4 completed). Cleared on full page refresh. */
  const [radUiMockPending] = useState(() => buildRadUiMockPending())
  const [radUiMockCompleted] = useState(() => buildRadUiMockCompleted())
  const [radUiMockStartedIds, setRadUiMockStartedIds] = useState<Set<string>>(() => new Set())
  /** ER sim rows (no DB): keep In Progress in UI after Start until refresh. */
  const [radSimStartedIds, setRadSimStartedIds] = useState<Set<string>>(() => new Set())
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleRequests = useMemo(() => {
    const byType = requests.filter((item) => {
      if (activeTab === 'X-Ray') return item.tab === 'X-Ray'
      if (activeTab === 'Ultrasound/Sonar') return item.tab === 'Ultrasound/Sonar'
      return item.tab === 'ECG'
    })
    return [...byType].sort((a, b) => {
      const rank = (s: ImagingStatus) => (s === 'Completed' ? 1 : 0)
      if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status)
      return 0
    })
  }, [requests, activeTab])
  const pendingRequests = useMemo(() => {
    const base = visibleRequests.filter((r) => r.status === 'Pending')
    if (activeTab !== 'X-Ray') return base
    const mockIds = new Set(radUiMockPending.map((m) => m.id))
    const mockPending = radUiMockPending.filter((m) => !radUiMockStartedIds.has(m.id))
    const rest = base.filter((b) => !mockIds.has(b.id))
    return [...mockPending, ...rest]
  }, [visibleRequests, activeTab, radUiMockPending, radUiMockStartedIds])
  const completedRequests = useMemo(() => {
    const base = visibleRequests.filter(
      (r) => (r.status === 'In Progress' || r.status === 'Completed') && !r.releasedToDoctorAt
    )
    if (activeTab !== 'X-Ray') return base
    const mockIds = new Set(radUiMockCompleted.map((m) => m.id))
    const startedMocks = radUiMockPending
      .filter((m) => radUiMockStartedIds.has(m.id))
      .map((m) => ({ ...m, status: 'In Progress' as const }))
    const rest = base.filter((b) => !mockIds.has(b.id))
    return [...startedMocks, ...radUiMockCompleted, ...rest]
  }, [visibleRequests, activeTab, radUiMockCompleted, radUiMockPending, radUiMockStartedIds])

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
      const simRad = isDiagnosticUiSimEnabled()
        ? buildImagingRequests(getDiagnosticSimRadiologyBedRows(), 'X-Ray', 'Radiology')
        : []
      const merged = [
        ...simRad,
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
    setImagingSubTab('requests')
  }, [activeTab])

  useEffect(() => {
    readSimulationFlagFromUrl()
    setSimUiActive(isDiagnosticUiSimEnabled())
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

  const showSuccessToast = (message = 'Result sent to doctor successfully!') => {
    setToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2200)
  }

  const patchErOrderStatus = useCallback(
    async (row: ImagingRequest, kind: 'IN_PROGRESS' | 'COMPLETED') => {
      if (isSimVisitId(row.visitId)) {
        setToast(
          kind === 'IN_PROGRESS'
            ? 'Simulation: procedure marked as started.'
            : 'Simulation: request marked ready for results entry.'
        )
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
        toastTimerRef.current = setTimeout(() => setToast(null), 2200)
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

  const handleStartProcedure = async (row: ImagingRequest) => {
    setError(null)
    const moveRowToInProgress = () => {
      setRequests((prev) =>
        prev.map((item) => (item.id === row.id ? { ...item, status: 'In Progress' } : item))
      )
      setImagingSubTab('results')
    }
    if (isRadLayoutMock(row)) {
      setRadUiMockStartedIds((prev) => {
        if (prev.has(row.id)) return prev
        console.log(`[ZION-DEBUG]: Patient ${row.patientName} started. Notifying Doctor...`)
        return new Set(prev).add(row.id)
      })
      setImagingSubTab('results')
      showSuccessToast('Procedure started — doctor notified (UI mock).')
      return
    }
    if (isSimVisitId(row.visitId)) {
      console.log(`[ZION-DEBUG]: Patient ${row.patientName} started. Notifying Doctor...`)
      await patchErOrderStatus(row, 'IN_PROGRESS')
      setRadSimStartedIds((prev) => new Set(prev).add(row.id))
      moveRowToInProgress()
      return
    }
    try {
      console.log(`[ZION-DEBUG]: Patient ${row.patientName} started. Notifying Doctor...`)
      await patchErOrderStatus(row, 'IN_PROGRESS')
      moveRowToInProgress()
      showSuccessToast('Procedure started — doctor notified that imaging is in progress.')
    } catch (e) {
      setError((e as Error)?.message || 'Failed to start procedure')
    }
  }

  const submitReviewToDoctor = async (row: ImagingRequest, techNotes: string) => {
    if (isSimVisitId(row.visitId)) {
      setError('Simulation row — not sent. Refresh removes all mock data.')
      return
    }
    if (!row?.uploadedImage && !String(row?.notes || '').trim() && !String(techNotes || '').trim()) {
      setError('Please save result first (file or notes) before sending to doctor.')
      return
    }
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
      setRequests((prev) => prev.filter((item) => item.id !== row.id))
      showSuccessToast()
      setImagingSubTab('results')
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

  const openFinalizeModal = (row: ImagingRequest) => {
    setFinalizeFor(row)
    setFinalizeFile(null)
    setFinalizeNotes('')
  }

  const confirmFinalizeAndSave = async () => {
    if (!finalizeFor) return
    if (!finalizeFile && !finalizeNotes.trim()) return
    setFinalizeBusy(true)
    setError(null)
    try {
      const attachmentPath = finalizeFile ? await readFileAsDataUrl(finalizeFile) : undefined
      const resultRes = await fetch('/api/lab/er-beds/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: finalizeFor.visitId,
          at: finalizeFor.at,
          testType: finalizeFor.requestType,
          result: finalizeNotes.trim(),
          department: finalizeFor.department,
          attachmentPath,
          technicianNotes: finalizeNotes.trim() || undefined,
        }),
      })
      const resultData = (await resultRes.json().catch(() => ({}))) as { error?: string }
      if (!resultRes.ok) throw new Error(resultData.error || 'Failed to save imaging result')

      showSuccessToast('Result confirmed and saved.')
      await fetchRequests(true)
      setFinalizeFor(null)
      setFinalizeFile(null)
      setFinalizeNotes('')
    } catch (e) {
      setError((e as Error)?.message || 'Failed to confirm and save result')
    } finally {
      setFinalizeBusy(false)
    }
  }
  const canConfirmFinalize = Boolean(finalizeFile) || finalizeNotes.trim().length > 0

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
          <div class="hospital">NARS Hospital</div>
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
          <main className="flex-1 overflow-auto overflow-x-hidden px-3 py-1">
            <div className="max-w-6xl mx-auto space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-1.5 inline-flex gap-1.5">
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
                {simUiActive ? (
                  <div className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100">
                    ER sim · API mock rows
                  </div>
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
                    Load imaging simulation
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImagingSubTab('requests')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
                    imagingSubTab === 'requests'
                      ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                      : 'text-slate-400 hover:text-slate-200 border border-slate-700/50'
                  }`}
                >
                  Pending Requests
                  {pendingRequests.length > 0 && (
                    <span className="ml-2 rounded-full bg-amber-500/30 px-1.5 py-0.5 text-[10px] text-amber-200">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setImagingSubTab('results')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${
                    imagingSubTab === 'results'
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                      : 'text-slate-400 hover:text-slate-200 border border-slate-700/50'
                  }`}
                >
                  Completed Results
                  {completedRequests.length > 0 && (
                    <span className="ml-2 rounded-full bg-emerald-500/30 px-1.5 py-0.5 text-[10px] text-emerald-200">
                      {completedRequests.length}
                    </span>
                  )}
                </button>
              </div>

              <section className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-1.5">
                {error && (
                  <div className="mb-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1.5 text-xs text-rose-300">
                    {error}
                  </div>
                )}
                <div className="overflow-hidden rounded-lg border border-slate-800/40">
                  {imagingSubTab === 'requests' ? (
                    <div className="p-2">
                      {loading && (
                        <div className="py-8 text-center text-sm text-slate-500">Loading imaging queue...</div>
                      )}
                      {!loading && pendingRequests.length === 0 && (
                        <div className="py-8 text-center text-sm text-slate-500">No pending requests in this tab.</div>
                      )}
                      {!loading && pendingRequests.length > 0 && (
                        <div className="flex flex-col gap-3">
                          {pendingRequests.map((item) => {
                            const procedureStarted =
                              item.status === 'In Progress' ||
                              (isRadLayoutMock(item) && radUiMockStartedIds.has(item.id)) ||
                              radSimStartedIds.has(item.id)
                            return (
                              <div
                                key={item.id}
                                className="rounded-lg border border-slate-800/80 bg-slate-900/55 px-4 py-3 shadow-sm transition-colors hover:bg-slate-900/70"
                              >
                                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] sm:items-center">
                                  <div className="min-w-0">
                                    <div
                                      className="font-medium leading-5 text-slate-100 truncate"
                                      title={item.patientName}
                                    >
                                      {item.patientName}
                                    </div>
                                    <div className="text-[11px] text-slate-500 truncate" title={item.visitId}>
                                      {item.visitId}
                                    </div>
                                  </div>
                                  <div className="min-w-0 text-sm text-slate-300">
                                    <span className="line-clamp-2" title={item.requestType}>
                                      {item.requestType}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                    {procedureStarted ? (
                                      <span className="inline-flex rounded-md border border-blue-500/40 bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-200">
                                        In Progress
                                      </span>
                                    ) : (
                                      <span className="inline-flex rounded-md border border-amber-500/35 bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-200">
                                        Pending
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-3 flex flex-col gap-3 border-t border-slate-800/60 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                                  <span className="tabular-nums text-sm text-slate-300">{item.requestedAt}</span>
                                  <div className="flex flex-nowrap items-center justify-end gap-3 sm:ml-auto">
                                    <button
                                      type="button"
                                      disabled={procedureStarted}
                                      onClick={() => void handleStartProcedure(item)}
                                      className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-blue-500/60 bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      Start Procedure
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
                    <div className="p-2 space-y-3">
                      {loading && (
                        <div className="py-8 text-center text-sm text-slate-500">Loading imaging queue...</div>
                      )}
                      {!loading && completedRequests.length === 0 && (
                        <div className="py-8 text-center text-sm text-slate-500">No completed results yet.</div>
                      )}
                      {!loading &&
                        completedRequests.map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-col gap-3 rounded-lg border border-slate-800/80 bg-slate-900/55 px-4 py-3 shadow-sm transition-colors hover:bg-slate-900/70"
                          >
                            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-8">
                              <div className="min-w-0">
                                <div
                                  className="text-slate-100 font-medium leading-5 truncate"
                                  title={item.patientName}
                                >
                                  {item.patientName}
                                </div>
                                <div className="text-[11px] text-slate-500 truncate" title={item.visitId}>
                                  {item.visitId}
                                </div>
                              </div>
                              <div className="min-w-0 text-slate-300 text-sm">
                                <span className="line-clamp-2" title={item.requestType}>
                                  {item.requestType}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-4 border-t border-slate-800/60 pt-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-slate-300 shrink-0">
                                <span className="tabular-nums text-slate-200">{item.requestedAt}</span>
                                <span
                                  className={`inline-flex text-xs px-2.5 py-1 rounded-md font-medium ${
                                    item.status === 'Completed'
                                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/35'
                                      : 'bg-amber-500/20 text-amber-200 border border-amber-500/35'
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </div>
                              <div className="flex min-w-0 flex-nowrap items-center justify-end gap-3 sm:ml-auto">
                                <button
                                  type="button"
                                  onClick={() => openFinalizeModal(item)}
                                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-100 transition-colors hover:bg-emerald-500/15"
                                >
                                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                                  Upload Result
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    Boolean(item.releasedToDoctorAt) ||
                                    (!item.uploadedImage && !item.notes.trim()) ||
                                    finalizeBusy ||
                                    reviewBusy
                                  }
                                  onClick={() =>
                                    void submitReviewToDoctor(
                                      item,
                                      String(item.technicianNotes || item.notes || '')
                                    )
                                  }
                                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-blue-600/80 bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Send className="h-4 w-4 shrink-0" aria-hidden />
                                  Send to Doctor
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePrint(item)}
                                  className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800/50 px-4 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700/70"
                                >
                                  <Printer className="h-4 w-4 shrink-0" aria-hidden />
                                  Print
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
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
      {finalizeFor && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-emerald-500/35 bg-slate-900/95 p-5 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
            <h3 className="text-base font-semibold text-slate-100">
              Confirm Final Results -{' '}
              {finalizeFor.department === 'Sonar'
                ? 'Sonar'
                : finalizeFor.department === 'ECG'
                  ? 'ECG'
                  : 'Radiology'}
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              Are you sure you want to finalize these results for <span className="font-semibold">{finalizeFor.patientName}</span>? This will send the data directly to the doctor&apos;s dashboard.
            </p>
            <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-950/40 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Result Summary</p>
              <div className="overflow-hidden rounded-lg border border-slate-700/60">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-slate-700/60">
                      <td className="px-3 py-2 text-slate-400">Patient</td>
                      <td className="px-3 py-2 text-slate-100">{finalizeFor.patientName}</td>
                    </tr>
                    <tr className="border-b border-slate-700/60">
                      <td className="px-3 py-2 text-slate-400">Exam Type</td>
                      <td className="px-3 py-2 text-slate-100">{finalizeFor.requestType}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-slate-400">Result Summary</td>
                      <td className="px-3 py-2 text-slate-100">{finalizeFor.notes || '(Image attached)'}</td>
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
                value={finalizeNotes}
                onChange={(e) => setFinalizeNotes(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none"
                placeholder="Add any notes or clinical observations here (optional)..."
              />
              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium text-slate-300">Upload File (PDF/Image)</label>
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-500/25">
                  <input
                    type="file"
                    accept=".pdf,image/*,.dcm"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null
                      e.target.value = ''
                      setFinalizeFile(f)
                    }}
                  />
                  {finalizeFile ? `Selected: ${finalizeFile.name}` : 'Choose PDF/Image'}
                </label>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={finalizeBusy || reviewBusy}
                onClick={() => {
                  setFinalizeFor(null)
                  setFinalizeFile(null)
                  setFinalizeNotes('')
                }}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel / Edit
              </button>
              <button
                type="button"
                disabled={finalizeBusy || !canConfirmFinalize}
                onClick={() => void confirmFinalizeAndSave()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 hover:shadow-[0_0_16px_rgba(16,185,129,0.45)] disabled:opacity-50"
              >
                {finalizeBusy ? 'Saving…' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      <BackButton />
    </ProtectedRoute>
  )
}
