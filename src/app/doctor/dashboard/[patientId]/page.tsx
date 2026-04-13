'use client'

import { useState, useEffect, useMemo, useCallback, Suspense, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import DoctorSidebar from '@/components/doctor/DoctorSidebar'
import { useAuth } from '@/contexts/AuthContext'
import {
  DEMO_RADIOLOGY_XRAY_IMAGE_URL,
  DEMO_SONAR_ULTRASOUND_IMAGE_URL,
} from '@/config/demoDiagnosticImageUrls'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Heart,
  Info,
  RotateCcw,
  Scale,
  ScanLine,
  Gauge,
  Send,
  Stethoscope,
  Thermometer,
  Waves,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'

type DashboardTab = 'exam' | 'results'

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

type ImagingBlock = {
  image: string
  summary: string
  technicianNotes?: string
} | null

type EcgBlock = {
  image: string
  summary: string
  technicianNotes?: string
} | null

type CompletedCase = {
  visitId: string
  patientId: string
  status: string
  patientName: string
  chiefComplaint: string
  visitDate: string
  badges: { xray: boolean; sonar: boolean; lab: boolean; ecg: boolean }
  labSummary?: string
  xray?: ImagingBlock
  sonar?: ImagingBlock
  ecg?: EcgBlock
}

type LabKV = { key: string; value: string }

type DiagnosticDept = 'Lab' | 'Radiology' | 'Sonar' | 'ECG'

const SELECTED_VISIT_STORAGE_KEY = 'zion_doctor_diagnostic_visitId'
const SELECTED_EXAM_VISIT_STORAGE_KEY = 'zion_doctor_exam_visitId'

const REQUEST_DEFAULTS: Record<DiagnosticDept, string> = {
  Lab: 'CBC, basic metabolic panel',
  Radiology: 'Chest X-Ray',
  Sonar: 'Abdomen ultrasound / Sonar',
  ECG: 'Standard 12-lead ECG',
}

function readStoredVisitId(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return sessionStorage.getItem(SELECTED_VISIT_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStoredVisitId(visitId: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (visitId) sessionStorage.setItem(SELECTED_VISIT_STORAGE_KEY, visitId)
    else sessionStorage.removeItem(SELECTED_VISIT_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function writeStoredExamVisitId(visitId: string | null) {
  if (typeof window === 'undefined') return
  try {
    if (visitId) sessionStorage.setItem(SELECTED_EXAM_VISIT_STORAGE_KEY, visitId)
    else sessionStorage.removeItem(SELECTED_EXAM_VISIT_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function pickCaseFromRows(rows: CompletedCase[], prev: CompletedCase | null): CompletedCase | null {
  if (rows.length === 0) {
    writeStoredVisitId(null)
    return null
  }
  let chosen: CompletedCase | null = null
  const stored = readStoredVisitId()
  if (stored) {
    chosen = rows.find((r) => r.visitId === stored) ?? null
  }
  if (!chosen && prev) {
    chosen = rows.find((r) => r.visitId === prev.visitId) ?? null
  }
  if (!chosen) chosen = rows[0] ?? null
  if (chosen) writeStoredVisitId(chosen.visitId)
  return chosen
}

function parseLabSummary(text: string): LabKV[] {
  if (!text?.trim()) return []
  return text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [k, ...rest] = chunk.split(':')
      return { key: (k || '').trim(), value: rest.join(':').trim() || '—' }
    })
}

function pickLabHighlights(rows: LabKV[], max = 3): LabKV[] {
  const priority = ['HB', 'HEMOGLOBIN', 'WBC', 'RBC', 'GLUCOSE']
  const out: LabKV[] = []
  const seen = new Set<string>()
  for (const p of priority) {
    const r = rows.find(
      (x) =>
        !seen.has(x.key) &&
        (x.key.toUpperCase().includes(p) || (p === 'HEMOGLOBIN' && x.key.toUpperCase().includes('HB')))
    )
    if (r) {
      out.push(r)
      seen.add(r.key)
    }
    if (out.length >= max) break
  }
  return out.length ? out : rows.slice(0, max)
}

function referenceRangeForTest(name: string): string {
  const u = name.toUpperCase()
  if (u.includes('HB') || u.includes('HEMOGLOBIN')) return '12 – 17 g/dL'
  if (u.includes('WBC')) return '4,000 – 11,000 /µL'
  if (u.includes('RBC')) return '4.5 – 5.5 M/µL'
  if (u.includes('GLUCOSE')) return '70 – 100 mg/dL'
  if (u.includes('CREATININE')) return '0.6 – 1.2 mg/dL'
  if (u.includes('PLATELET')) return '150 – 400 K/µL'
  return '—'
}

function formatVisitDateTime(d: string): string {
  try {
    return new Date(d).toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return d
  }
}

function DoctorDashboardInner() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const { user } = useAuth()

  const patientKey =
    typeof params.patientId === 'string' ? decodeURIComponent(params.patientId) : ''

  const [dashboardTab, setDashboardTab] = useState<DashboardTab>(
    tabParam === 'results' ? 'results' : 'exam'
  )

  const [examQueue, setExamQueue] = useState<ExamQueuePatient[]>([])
  const [examInProgress, setExamInProgress] = useState<ExamQueuePatient[]>([])
  const [examLoading, setExamLoading] = useState(true)
  const [examError, setExamError] = useState<string | null>(null)

  const [cases, setCases] = useState<CompletedCase[]>([])
  const [selectedCase, setSelectedCase] = useState<CompletedCase | null>(null)
  const [loading, setLoading] = useState(true)
  const [clinicalNotes, setClinicalNotes] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [imagingView, setImagingView] = useState<'xray' | 'sonar' | null>(null)
  const [ecgView, setEcgView] = useState(false)
  const [labModalOpen, setLabModalOpen] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [requestModal, setRequestModal] = useState<DiagnosticDept | null>(null)
  const [requestContent, setRequestContent] = useState('')
  const [requestSending, setRequestSending] = useState(false)

  const [finalDiagnosis, setFinalDiagnosis] = useState('')
  const [prescriptionDraft, setPrescriptionDraft] = useState('')
  const [prescriptionSent, setPrescriptionSent] = useState(false)
  const [prescriptionModalOpen, setPrescriptionModalOpen] = useState(false)
  const [prescriptionSending, setPrescriptionSending] = useState(false)
  const [submitArchiveBusy, setSubmitArchiveBusy] = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)
  const lastSavedNotesRef = useRef<string>('')

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
    const data = raw as {
      queue?: ExamQueuePatient[]
      inProgress?: ExamQueuePatient[]
    }
    return {
      queue: Array.isArray(data.queue) ? data.queue : [],
      inProgress: Array.isArray(data.inProgress) ? data.inProgress : [],
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setExamLoading(true)
        setExamError(null)
        const { queue, inProgress } = await loadExamQueues()
        if (cancelled) return
        setExamQueue(queue)
        setExamInProgress(inProgress)
      } catch (e) {
        if (!cancelled) {
          setExamQueue([])
          setExamInProgress([])
          setExamError((e as Error)?.message || 'Failed to load waiting list')
        }
      } finally {
        if (!cancelled) setExamLoading(false)
      }
    })()
    const t = setInterval(async () => {
      try {
        const { queue, inProgress } = await loadExamQueues()
        if (cancelled) return
        setExamQueue(queue)
        setExamInProgress(inProgress)
        setExamError(null)
      } catch (e) {
        if (!cancelled) setExamError((e as Error)?.message || 'Failed to refresh queue')
      }
    }, 10000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [loadExamQueues])

  const loadCases = useCallback(async (): Promise<CompletedCase[]> => {
    const res = await fetch(`/api/doctor/completed-cases?key=${encodeURIComponent(patientKey || '')}`)
    const raw = await res.json().catch(() => null)
    if (!res.ok) {
      const msg =
        raw && typeof raw === 'object' && raw !== null && 'error' in raw
          ? String((raw as { error?: string }).error)
          : `Request failed (${res.status})`
      throw new Error(msg)
    }
    if (!Array.isArray(raw)) return []
    return raw as CompletedCase[]
  }, [patientKey])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setFetchError(null)
        const rows = await loadCases()
        if (cancelled) return
        setCases(rows)
        setSelectedCase((prev) => pickCaseFromRows(rows, prev))
      } catch (e) {
        if (!cancelled) {
          setCases([])
          setSelectedCase(null)
          setFetchError((e as Error)?.message || 'Failed to load cases')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    const interval = setInterval(async () => {
      try {
        const rows = await loadCases()
        if (cancelled) return
        setCases(rows)
        setSelectedCase((prev) => pickCaseFromRows(rows, prev))
        setFetchError(null)
      } catch (e) {
        if (!cancelled) setFetchError((e as Error)?.message || 'Failed to refresh cases')
      }
    }, 8000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [loadCases])

  const selectedExamPatient = useMemo(() => {
    if (!patientKey) return null
    const all = [...examQueue, ...examInProgress]
    return (
      all.find((p) => p.patientId === patientKey || p.visitId === patientKey) ?? null
    )
  }, [examQueue, examInProgress, patientKey])

  useEffect(() => {
    const vid = selectedExamPatient?.visitId ?? null
    writeStoredExamVisitId(vid)
  }, [selectedExamPatient?.visitId])

  useEffect(() => {
    if (dashboardTab !== 'exam') return
    if (!patientKey) return
    if (examLoading) return
    if (selectedExamPatient) return
    router.replace('/doctor/queue')
  }, [dashboardTab, patientKey, examLoading, selectedExamPatient, router])

  useEffect(() => {
    setClinicalNotes('')
  }, [patientKey])

  useEffect(() => {
    setFinalDiagnosis('')
    setPrescriptionDraft('')
    setPrescriptionSent(false)
  }, [selectedCase?.visitId])

  const resetContextKey = useMemo(
    () => (dashboardTab === 'exam' ? patientKey : selectedCase?.visitId ?? ''),
    [dashboardTab, patientKey, selectedCase?.visitId]
  )

  useEffect(() => {
    setMessage(null)
    setError(null)
    setZoom(1)
    setRotation(0)
    setImagingView(null)
    setLabModalOpen(false)
  }, [dashboardTab, resetContextKey])

  const saveClinicalNotesToVisit = useCallback(
    async (visitId: string, text: string) => {
      const trimmed = text.trim()
      if (!visitId) return
      if (trimmed === (lastSavedNotesRef.current || '').trim()) return
      setNotesSaving(true)
      try {
        const res = await fetch(`/api/visits/${encodeURIComponent(visitId)}`)
        const data = (await res.json().catch(() => ({}))) as { visit?: { notes?: string | null }; error?: string }
        if (!res.ok) throw new Error(data.error || 'Failed to load visit')
        let parsed: Record<string, unknown> = {}
        try {
          if (data.visit?.notes) parsed = JSON.parse(String(data.visit.notes)) as Record<string, unknown>
        } catch {
          parsed = {}
        }
        const nextNotes = JSON.stringify({
          ...parsed,
          clinicalImpression: trimmed,
          clinicalImpressionUpdatedAt: new Date().toISOString(),
        })
        const patchRes = await fetch(`/api/visits/${encodeURIComponent(visitId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: nextNotes }),
        })
        const patchData = (await patchRes.json().catch(() => ({}))) as { error?: string }
        if (!patchRes.ok) throw new Error(patchData.error || 'Failed to save notes')
        lastSavedNotesRef.current = trimmed
      } finally {
        setNotesSaving(false)
      }
    },
    []
  )

  useEffect(() => {
    const visitId = selectedExamPatient?.visitId
    if (!visitId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/visits/${encodeURIComponent(visitId)}`)
        const data = (await res.json().catch(() => ({}))) as { visit?: { notes?: string | null }; error?: string }
        if (!res.ok) return
        let parsed: Record<string, unknown> = {}
        try {
          if (data.visit?.notes) parsed = JSON.parse(String(data.visit.notes)) as Record<string, unknown>
        } catch {
          parsed = {}
        }
        const stored = typeof parsed.clinicalImpression === 'string' ? parsed.clinicalImpression : ''
        if (cancelled) return
        if (stored && !clinicalNotes.trim()) setClinicalNotes(stored)
        lastSavedNotesRef.current = stored || clinicalNotes.trim()
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExamPatient?.visitId])

  const goToTab = useCallback(
    async (tab: DashboardTab) => {
      if (tab === dashboardTab) return
      if (dashboardTab === 'exam' && selectedExamPatient?.visitId) {
        try {
          await saveClinicalNotesToVisit(selectedExamPatient.visitId, clinicalNotes)
        } catch (e) {
          setError((e as Error)?.message || 'Failed to save notes')
        }
      }
      setDashboardTab(tab)
    },
    [clinicalNotes, dashboardTab, saveClinicalNotesToVisit, selectedExamPatient?.visitId]
  )

  const backToQueue = useCallback(() => {
    writeStoredExamVisitId(null)
    writeStoredVisitId(null)
    router.push('/doctor/queue')
  }, [router])

  const openImagingModal = useCallback((view: 'xray' | 'sonar') => {
    setZoom(1)
    setRotation(0)
    setImagingView(view)
  }, [])

  const xrayImageUrl = useMemo(() => {
    if (!selectedCase) return ''
    const u = selectedCase.xray?.image?.trim()
    if (u) return u
    if (selectedCase.badges.xray) return DEMO_RADIOLOGY_XRAY_IMAGE_URL
    return ''
  }, [selectedCase])

  const sonarImageUrl = useMemo(() => {
    if (!selectedCase) return ''
    const u = selectedCase.sonar?.image?.trim()
    if (u) return u
    if (selectedCase.badges.sonar) return DEMO_SONAR_ULTRASOUND_IMAGE_URL
    return ''
  }, [selectedCase])

  const ecgImageUrl = useMemo(() => {
    if (!selectedCase) return ''
    const u = selectedCase.ecg?.image?.trim()
    if (u) return u
    return ''
  }, [selectedCase])

  const activeImaging = useMemo(() => {
    if (!selectedCase || !imagingView) return null
    return imagingView === 'xray' ? selectedCase.xray : selectedCase.sonar
  }, [selectedCase, imagingView])

  const modalImageUrl =
    imagingView === 'xray' ? xrayImageUrl : imagingView === 'sonar' ? sonarImageUrl : ''

  const labRows = useMemo(
    () => (selectedCase ? parseLabSummary(selectedCase.labSummary || '') : []),
    [selectedCase]
  )
  const labHighlights = useMemo(() => pickLabHighlights(labRows, 3), [labRows])

  const techNotesX = selectedCase?.xray?.technicianNotes?.trim()
  const techNotesS = selectedCase?.sonar?.technicianNotes?.trim()
  const techNotesEcg = selectedCase?.ecg?.technicianNotes?.trim()

  const xrayFindingText = useMemo(
    () => selectedCase?.xray?.summary?.trim() || 'كسر بالضلع الثالث',
    [selectedCase?.xray?.summary]
  )
  const xrayFindingRtl = /[\u0600-\u06FF]/.test(xrayFindingText)

  const caseIndex = cases.findIndex((c) => c.visitId === selectedCase?.visitId)
  const goPrevCase = () => {
    if (cases.length === 0) return
    const i = caseIndex <= 0 ? cases.length - 1 : caseIndex - 1
    const next = cases[i]
    setSelectedCase(next)
    writeStoredVisitId(next.visitId)
  }
  const goNextCase = () => {
    if (cases.length === 0) return
    const i = caseIndex >= cases.length - 1 ? 0 : caseIndex + 1
    const next = cases[i]
    setSelectedCase(next)
    writeStoredVisitId(next.visitId)
  }

  const openRequestModal = (dept: DiagnosticDept) => {
    setRequestContent(REQUEST_DEFAULTS[dept])
    setRequestModal(dept)
  }

  const submitDiagnosticRequest = async () => {
    if (!selectedExamPatient || !requestModal) return
    const trimmed = requestContent.trim()
    if (!trimmed) {
      setError('Enter request details.')
      return
    }
    setRequestSending(true)
    setError(null)
    try {
      const res = await fetch('/api/emergency/doctor/lab-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: selectedExamPatient.visitId,
          content: trimmed,
          department: requestModal,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Request failed')
      setMessage(
        `${requestModal === 'Lab' ? 'Lab' : requestModal === 'Radiology' ? 'X-Ray' : requestModal === 'ECG' ? 'ECG' : 'Sonar'} request sent.`
      )
      setRequestModal(null)
      const { queue, inProgress } = await loadExamQueues()
      setExamQueue(queue)
      setExamInProgress(inProgress)
    } catch (e) {
      setError((e as Error)?.message || 'Failed to send request')
    } finally {
      setRequestSending(false)
    }
  }

  const sendPrescriptionToPharmacy = async () => {
    const trimmed = prescriptionDraft.trim()
    if (!trimmed) {
      setError('Enter the prescription before sending.')
      return
    }
    if (!selectedCase) {
      setError('No case selected.')
      return
    }
    if (!user?.id) {
      setError('Not authenticated.')
      return
    }
    setPrescriptionSending(true)
    setError(null)
    try {
      const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean)
      const prescriptionItems = lines.map((line) => {
        const parts = line.split(' - ')
        const medicinePart = parts[0] || line
        const frequency = (parts[1] || 'As prescribed').trim()
        const medicineMatch = medicinePart.match(/^(.+?)\s+(\d+.*)$/)
        const medicineName = medicineMatch ? medicineMatch[1].trim() : medicinePart.trim()
        const dosage = medicineMatch ? medicineMatch[2].trim() : ''
        return { medicineName, dosage, frequency }
      })

      const res = await fetch('/api/doctor/visit/send-to-pharmacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: selectedCase.visitId,
          patientId: selectedCase.patientId,
          doctorId: user.id,
          prescriptionItems,
          diagnosis: finalDiagnosis.trim() || undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Failed to send prescription')
      setPrescriptionSent(true)
      setPrescriptionModalOpen(false)
      setMessage('Prescription sent to pharmacy.')
    } catch (e) {
      setError((e as Error)?.message || 'Failed to send prescription.')
    } finally {
      setPrescriptionSending(false)
    }
  }

  const handleSubmitArchive = async () => {
    if (!selectedCase) return
    setSubmitArchiveBusy(true)
    setMessage(null)
    setError(null)
    try {
      if (selectedExamPatient?.visitId) {
        try {
          await saveClinicalNotesToVisit(selectedExamPatient.visitId, clinicalNotes)
        } catch {
          // keep going; archive should still proceed
        }
      }
      const res = await fetch('/api/doctor/complete-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: selectedCase.visitId,
          doctorImpression: clinicalNotes.trim(),
          finalDiagnosis: finalDiagnosis.trim(),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; success?: boolean }
      if (!res.ok) throw new Error(data.error || 'Failed to archive visit')
      setMessage('Visit submitted and archived.')
      writeStoredExamVisitId(null)
      writeStoredVisitId(null)
      router.push('/doctor/queue')
    } catch (e) {
      setError((e as Error)?.message || 'Failed to archive visit')
    } finally {
      setSubmitArchiveBusy(false)
    }
  }

  const handleSaveDraft = () => {
    setMessage('Draft saved locally.')
  }

  const examGlassPanel =
    'rounded-2xl border border-cyan-400/20 bg-white/[0.06] shadow-[0_0_36px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl'

  const examActionCard =
    'group relative flex w-full min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-2xl border px-5 py-6 text-center shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(34,211,238,0.12)] active:translate-y-0 disabled:pointer-events-none disabled:opacity-40 disabled:hover:translate-y-0 sm:px-6 sm:py-7'

  return (
    <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']} redirectTo="/">
      <div className="flex h-screen max-h-screen overflow-hidden bg-[#0a0f1e]">
        <DoctorSidebar />
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div
            className={dashboardTab === 'results' ? 'pointer-events-none absolute inset-0 hidden' : 'pointer-events-none absolute inset-0 opacity-95'}
            aria-hidden
            style={
              dashboardTab === 'results'
                ? undefined
                : {
                    background: `
              radial-gradient(ellipse 100% 70% at 50% -15%, rgba(56, 189, 248, 0.14), transparent 52%),
              radial-gradient(ellipse 70% 50% at 95% 40%, rgba(59, 130, 246, 0.1), transparent 42%),
              linear-gradient(180deg, #0a1628 0%, #050a14 50%, #070f1a 100%)
            `,
                  }
            }
          />
          <div
            className={`relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden ${dashboardTab === 'results' ? 'bg-[#0d1117]' : ''}`}
          >
          <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-[#1e2a3a] bg-[#0d1117] px-4">
            <nav className="flex items-center gap-6" aria-label="Workspace tabs">
              <button
                type="button"
                onClick={() => void goToTab('exam')}
                className={`pb-3 pt-3 text-sm font-medium transition-colors ${
                  dashboardTab === 'exam'
                    ? 'border-b-2 border-[#38bdf8] text-[#38bdf8]'
                    : 'border-b-2 border-transparent text-[#6b7280] hover:text-[#94a3b8]'
                }`}
              >
                Clinical Exam
              </button>
              <button
                type="button"
                onClick={() => void goToTab('results')}
                className={`pb-3 pt-3 text-sm font-medium transition-colors ${
                  dashboardTab === 'results'
                    ? 'border-b-2 border-[#38bdf8] text-[#38bdf8]'
                    : 'border-b-2 border-transparent text-[#6b7280] hover:text-[#94a3b8]'
                }`}
              >
                Results Review
              </button>
            </nav>
            <div className="justify-self-center px-2">
              <div className="max-w-[22rem] truncate rounded-lg border border-[#1e3a5f] bg-[#1a2535] px-3 py-1.5 text-xs text-[#e2e8f0]">
                {dashboardTab === 'exam' ? (
                  selectedExamPatient ? (
                    <>
                      <span className="font-medium">{selectedExamPatient.name}</span>
                      <span className="mx-2 text-[#4a5568]">|</span>
                      <span className="text-[#94a3b8]">ID: {selectedExamPatient.patientId}</span>
                    </>
                  ) : examLoading ? (
                    <span className="text-[#6b7280]">Loading…</span>
                  ) : (
                    <span className="text-[#6b7280]">No patient selected</span>
                  )
                ) : selectedCase ? (
                  <>
                    <span className="font-medium">{selectedCase.patientName}</span>
                    <span className="mx-2 text-[#4a5568]">|</span>
                    <span className="text-[#94a3b8]">ID: {selectedCase.patientId}</span>
                  </>
                ) : loading ? (
                  <span className="text-[#6b7280]">Loading…</span>
                ) : (
                  <span className="text-[#6b7280]">No case selected</span>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={backToQueue}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2d3748] px-3 py-2 text-sm text-[#94a3b8] transition-colors hover:border-[#4a5568] hover:text-[#cbd5e1]"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back to Queue
              </button>
            </div>
          </header>

          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {dashboardTab === 'exam' ? (
              <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-3 overflow-hidden px-4 py-3 sm:gap-3 sm:px-5 sm:py-4">
                {examError ? (
                  <p className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
                    {examError}
                  </p>
                ) : null}
                {message ? (
                  <p className="shrink-0 text-sm text-emerald-400">{message}</p>
                ) : null}
                {error ? <p className="shrink-0 text-sm text-red-400">{error}</p> : null}
                {notesSaving && dashboardTab === 'exam' ? (
                  <p className="shrink-0 text-[11px] text-slate-400">Saving notes…</p>
                ) : null}

                <div
                  className={`shrink-0 px-3 py-2.5 sm:px-4 sm:py-3 ${examGlassPanel}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {examLoading ? (
                        <div className="h-8 w-64 max-w-full animate-pulse rounded-lg bg-slate-700/50" />
                      ) : selectedExamPatient ? (
                        <>
                          <h1 className="text-lg font-bold leading-tight text-white sm:text-xl">
                            {selectedExamPatient.name}
                          </h1>
                          <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">
                            Age {selectedExamPatient.age ?? '—'} · {selectedExamPatient.gender || '—'} ·{' '}
                            <span className="font-mono text-slate-300">{selectedExamPatient.patientId}</span>
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">Patient not found in queue.</p>
                      )}
                    </div>
                    {selectedExamPatient?.allergies ? (
                      <div className="shrink-0 rounded-lg border border-red-500/35 bg-red-950/40 px-2.5 py-1.5 text-[11px] font-medium text-red-100">
                        Allergies: {selectedExamPatient.allergies}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 gap-4 overflow-hidden lg:gap-6">
                  {/* Left: vitals + notes share one column — identical width */}
                  <div className="flex w-full max-w-[min(100%,22rem)] shrink-0 flex-col gap-3 min-[480px]:max-w-[24rem] sm:max-w-[26rem] lg:max-w-[28rem]">
                    <div
                      className={`flex shrink-0 flex-col overflow-hidden p-4 sm:p-5 ${examGlassPanel}`}
                    >
                      <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
                        <span className="flex items-center gap-2.5 text-sm font-bold uppercase tracking-[0.12em] text-cyan-300/95">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-400/25">
                            <Stethoscope className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden />
                          </span>
                          Vital signs
                        </span>
                        <span className="rounded-md border border-slate-600/60 bg-slate-900/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Read-only
                        </span>
                      </div>
                      {!selectedExamPatient ? (
                        <p className="text-sm text-slate-500">—</p>
                      ) : !selectedExamPatient.vitals ? (
                        <p className="text-sm text-slate-500">No vitals recorded.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-slate-600/45 bg-[#0c1220]/90 px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors hover:border-slate-500/50">
                            <Gauge className="mx-auto h-5 w-5 text-sky-400" aria-hidden />
                            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              BP
                            </p>
                            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-white sm:text-xl">
                              {selectedExamPatient.vitals.bp}
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-600/45 bg-[#0c1220]/90 px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors hover:border-slate-500/50">
                            <Heart className="mx-auto h-5 w-5 text-sky-400" aria-hidden />
                            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              HR
                            </p>
                            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-white sm:text-xl">
                              {selectedExamPatient.vitals.heartRate}{' '}
                              <span className="text-xs font-normal text-slate-500">bpm</span>
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-600/45 bg-[#0c1220]/90 px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors hover:border-slate-500/50">
                            <Thermometer className="mx-auto h-5 w-5 text-sky-400" aria-hidden />
                            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Temp
                            </p>
                            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-white sm:text-xl">
                              {selectedExamPatient.vitals.temperature.toFixed(1)}
                              <span className="text-xs font-normal text-slate-500"> °C</span>
                            </p>
                          </div>
                          <div className="rounded-xl border border-slate-600/45 bg-[#0c1220]/90 px-3 py-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-colors hover:border-slate-500/50">
                            <Scale className="mx-auto h-5 w-5 text-sky-400" aria-hidden />
                            <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              Wt
                            </p>
                            <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-white sm:text-xl">
                              {selectedExamPatient.vitals.weight.toFixed(1)}
                              <span className="text-xs font-normal text-slate-500"> kg</span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div
                      className={`flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden p-3 sm:p-4 ${examGlassPanel}`}
                    >
                      <label
                        htmlFor="clinical-notes"
                        className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                      >
                        Doctor&apos;s notes
                      </label>
                      <textarea
                        id="clinical-notes"
                        value={clinicalNotes}
                        onChange={(e) => setClinicalNotes(e.target.value)}
                        placeholder="Brief impression & plan…"
                        disabled={!selectedExamPatient}
                        rows={3}
                        className="min-h-0 w-full flex-1 resize-none rounded-xl border border-slate-600/50 bg-[#070b14]/70 px-3 py-2 text-xs leading-relaxed text-zinc-100 shadow-[inset_0_2px_8px_rgba(0,0,0,0.35)] placeholder:text-slate-600 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/25 disabled:opacity-45 sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* Right: stacked action cards */}
                  <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 py-0.5 sm:gap-5">
                    <button
                      type="button"
                      disabled={!selectedExamPatient}
                      onClick={() => openRequestModal('Lab')}
                      className={`${examActionCard} border-emerald-500/25 bg-gradient-to-br from-emerald-950/50 via-[#0f172a] to-[#0a0f1e] hover:border-emerald-400/45`}
                    >
                      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 ring-1 ring-emerald-400/15">
                        <FlaskConical className="h-9 w-9 text-emerald-400 sm:h-10 sm:w-10" strokeWidth={2} aria-hidden />
                      </div>
                      <span className="text-sm font-bold uppercase tracking-wide text-emerald-50/95">
                        Order Lab Test
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={!selectedExamPatient}
                      onClick={() => openRequestModal('Sonar')}
                      className={`${examActionCard} border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 via-[#0f172a] to-[#0a0f1e] hover:border-cyan-400/50`}
                    >
                      <div className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-3 ring-1 ring-cyan-400/20">
                        <Waves className="h-9 w-9 text-cyan-400 sm:h-10 sm:w-10" strokeWidth={2} aria-hidden />
                      </div>
                      <span className="text-sm font-bold uppercase tracking-wide text-cyan-50">Request Sonar</span>
                    </button>
                    <button
                      type="button"
                      disabled={!selectedExamPatient}
                      onClick={() => openRequestModal('Radiology')}
                      className={`${examActionCard} border-blue-500/30 bg-gradient-to-br from-blue-950/45 via-[#0f172a] to-[#0a0f1e] hover:border-blue-400/50`}
                    >
                      <div className="rounded-2xl border border-blue-400/25 bg-blue-500/10 p-3 ring-1 ring-blue-400/20">
                        <ScanLine className="h-9 w-9 text-blue-400 sm:h-10 sm:w-10" strokeWidth={2} aria-hidden />
                      </div>
                      <span className="text-sm font-bold uppercase tracking-wide text-blue-50">Request X-Ray</span>
                    </button>
                    <button
                      type="button"
                      disabled={!selectedExamPatient}
                      onClick={() => openRequestModal('ECG')}
                      className={`${examActionCard} border-rose-500/30 bg-gradient-to-br from-rose-950/45 via-[#0f172a] to-[#0a0f1e] hover:border-rose-400/50`}
                    >
                      <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-3 ring-1 ring-rose-400/20">
                        <Heart className="h-9 w-9 text-rose-400 sm:h-10 sm:w-10" strokeWidth={2} aria-hidden />
                      </div>
                      <span className="text-sm font-bold uppercase tracking-wide text-rose-50">
                        Request ECG
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0d1117] text-[#e2e8f0]">
                <style>{`
                  @keyframes doctor-dash-sonar-ring {
                    0%, 100% { opacity: 0.2; transform: scale(0.95); }
                    50% { opacity: 0.5; transform: scale(1); }
                  }
                  .doctor-dash-sonar-ring-1 { animation: doctor-dash-sonar-ring 2s ease-in-out infinite; animation-delay: 0s; }
                  .doctor-dash-sonar-ring-2 { animation: doctor-dash-sonar-ring 2s ease-in-out infinite; animation-delay: 0.4s; }
                  .doctor-dash-sonar-ring-3 { animation: doctor-dash-sonar-ring 2s ease-in-out infinite; animation-delay: 0.8s; }
                `}</style>
                <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-3.5 overflow-hidden px-4 py-3">
                  {message ? (
                    <p className="shrink-0 truncate text-[11px] text-emerald-400 sm:text-xs">{message}</p>
                  ) : null}
                  {error ? (
                    <p className="shrink-0 truncate text-[11px] text-red-400 sm:text-xs">{error}</p>
                  ) : null}
                  {fetchError ? (
                    <p className="mb-1 shrink-0 truncate rounded border border-amber-500/30 bg-amber-950/30 px-2 py-0.5 text-[10px] text-amber-200">
                      {fetchError}
                    </p>
                  ) : null}

                  {loading ? (
                    <div className="flex min-h-0 flex-1 flex-col gap-3.5">
                      <div className="h-12 animate-pulse rounded-xl bg-[#1e2a3a]/60" />
                      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3.5 lg:grid-cols-4 xl:grid-cols-4">
                        <div className="h-44 animate-pulse rounded-2xl bg-[#1e2a3a]/50" />
                        <div className="h-44 animate-pulse rounded-2xl bg-[#1e2a3a]/50" />
                        <div className="h-44 animate-pulse rounded-2xl bg-[#1e2a3a]/50" />
                        <div className="h-44 animate-pulse rounded-2xl bg-[#1e2a3a]/50" />
                      </div>
                      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-[1.3fr_1fr]">
                        <div className="h-36 animate-pulse rounded-2xl bg-[#1e2a3a]/50" />
                        <div className="h-36 animate-pulse rounded-2xl bg-[#1e2a3a]/50" />
                      </div>
                    </div>
                  ) : null}

                  {!loading && cases.length === 0 && !fetchError ? (
                    <p className="py-6 text-center text-xs text-[#6b7280]">No cases with results.</p>
                  ) : null}

                  {!loading && selectedCase ? (
                    <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-hidden">
                      {cases.length > 1 ? (
                        <div className="flex shrink-0 items-center justify-center gap-2 py-0.5">
                          <button
                            type="button"
                            onClick={goPrevCase}
                            className="rounded-lg border border-[#2d3748] bg-[#1a2535] p-1.5 text-[#e2e8f0] shadow-sm transition-colors hover:border-[#38bdf8]/40 hover:bg-[#0f1923]"
                            aria-label="Previous case"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className="min-w-[3rem] text-center text-[9px] font-semibold tabular-nums tracking-widest text-[#6b7280] uppercase">
                            {caseIndex + 1} / {cases.length}
                          </span>
                          <button
                            type="button"
                            onClick={goNextCase}
                            className="rounded-lg border border-[#2d3748] bg-[#1a2535] p-1.5 text-[#e2e8f0] shadow-sm transition-colors hover:border-[#38bdf8]/40 hover:bg-[#0f1923]"
                            aria-label="Next case"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}
                      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3.5 overflow-hidden">
                      <div className="grid min-h-0 grid-cols-1 items-stretch gap-3.5 lg:grid-cols-4 xl:grid-cols-4">
                        <article className="flex min-h-0 flex-col rounded-2xl border border-[#1e2a3a] bg-white/[0.04] shadow-[0_0_0_1px_rgba(56,189,248,0.06),0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                          <div className="shrink-0 border-b border-[#1e2a3a] px-3 py-2.5">
                            <p className="text-[10px] font-medium uppercase tracking-widest text-[#4a5568]">Imaging</p>
                            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg leading-none" aria-hidden>
                                  🩻
                                </span>
                                <span className="font-medium text-[#38bdf8]">X-Ray</span>
                              </div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                                  xrayImageUrl
                                    ? 'border border-[#14532d] bg-[#052e16] text-[#22c55e]'
                                    : 'border border-[#713f12] bg-[#1c1406] text-[#f59e0b]'
                                }`}
                              >
                                {xrayImageUrl ? 'Ready' : 'Pending'}
                              </span>
                            </div>
                          </div>
                          <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
                            <button
                              type="button"
                              onClick={() => openImagingModal('xray')}
                              className="relative block h-28 w-full overflow-hidden rounded-lg border border-[#1e2a3a] bg-[#050608] text-left transition-opacity hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/40"
                            >
                              {xrayImageUrl ? (
                                <>
                                  <img
                                    src={xrayImageUrl}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    className="h-full w-full object-contain"
                                  />
                                  <span className="pointer-events-none absolute bottom-1.5 right-2 text-[10px] text-[#4a6080]">
                                    Tap to expand
                                  </span>
                                </>
                              ) : (
                                <>
                                  <div
                                    className="absolute inset-0 opacity-90"
                                    style={{
                                      background:
                                        'radial-gradient(ellipse 80% 100% at 50% 50%, #1a1f28 0%, #0a0c10 45%, #050608 100%)',
                                    }}
                                    aria-hidden
                                  />
                                  <div
                                    className="absolute left-1/2 top-1/2 h-20 w-14 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-[#2a3544]/60 bg-[#121820]/80"
                                    aria-hidden
                                  />
                                  <div
                                    className="absolute left-[28%] top-[32%] h-10 w-0.5 rotate-12 bg-[#3d4a5c]/50"
                                    aria-hidden
                                  />
                                  <div
                                    className="absolute right-[30%] top-[38%] h-8 w-0.5 -rotate-6 bg-[#3d4a5c]/45"
                                    aria-hidden
                                  />
                                  <span className="absolute bottom-1.5 right-2 text-[10px] text-[#4a6080]">
                                    Awaiting image
                                  </span>
                                </>
                              )}
                            </button>
                            <div
                              className="flex items-start gap-2 rounded-lg border border-[#3d1f0f] bg-[#1a0f0a] p-2"
                              dir={xrayFindingRtl ? 'rtl' : 'ltr'}
                            >
                              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#f59e0b]" aria-hidden />
                              <p className="text-sm leading-snug text-[#e2a870]">{xrayFindingText}</p>
                            </div>
                            <div className="flex items-start gap-2 text-xs text-[#4a5568]">
                              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                              <p>
                                {techNotesX
                                  ? techNotesX
                                  : 'No technician notes for this X-ray study.'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openImagingModal('xray')}
                              className="text-center text-[11px] text-[#38bdf8] opacity-70 transition-opacity hover:opacity-100"
                            >
                              View full image ↗
                            </button>
                          </div>
                        </article>

                        <article className="flex min-h-0 flex-col rounded-2xl border border-[#1e2a3a] bg-white/[0.04] shadow-[0_0_0_1px_rgba(56,189,248,0.06),0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                          <div className="shrink-0 border-b border-[#1e2a3a] px-3 py-2.5">
                            <p className="text-[10px] font-medium uppercase tracking-widest text-[#4a5568]">Ultrasound</p>
                            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Waves className="h-4 w-4 text-[#38bdf8]" strokeWidth={2} aria-hidden />
                                <span className="font-medium text-[#38bdf8]">Sonar</span>
                              </div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                                  sonarImageUrl
                                    ? 'border border-[#14532d] bg-[#052e16] text-[#22c55e]'
                                    : 'border border-[#713f12] bg-[#1c1406] text-[#f59e0b]'
                                }`}
                              >
                                {sonarImageUrl ? 'Ready' : 'In progress'}
                              </span>
                            </div>
                          </div>
                          <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
                            <button
                              type="button"
                              onClick={() => openImagingModal('sonar')}
                              className={`relative flex h-28 w-full items-center justify-center overflow-hidden rounded-lg border text-left transition-opacity hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]/40 ${
                                sonarImageUrl ? 'border-[#1e2a3a] bg-[#050608]' : 'border-dashed border-[#1e2a3a] bg-[#080f1a]'
                              }`}
                            >
                              {sonarImageUrl ? (
                                <>
                                  <img
                                    src={sonarImageUrl}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    className="h-full w-full object-contain"
                                  />
                                  <span className="pointer-events-none absolute bottom-1.5 right-2 text-[10px] text-[#4a6080]">
                                    Tap to expand
                                  </span>
                                </>
                              ) : (
                                <>
                                  <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#1e3a5f] doctor-dash-sonar-ring-1" />
                                  <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#1e3a5f] doctor-dash-sonar-ring-2" />
                                  <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#1e3a5f] doctor-dash-sonar-ring-3" />
                                  <div className="relative z-10 flex flex-col items-center gap-1">
                                    <ScanLine className="h-5 w-5 text-[#4a6080]" strokeWidth={1.5} aria-hidden />
                                    <span className="text-[11px] text-[#4a6080]">Awaiting scan...</span>
                                  </div>
                                </>
                              )}
                            </button>
                            <div className="flex items-start gap-2 text-xs text-[#4a5568]">
                              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                              <p>
                                {techNotesS
                                  ? techNotesS
                                  : 'No technician notes for this ultrasound study.'}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openImagingModal('sonar')}
                              className="text-center text-[11px] text-[#38bdf8] opacity-70 transition-opacity hover:opacity-100"
                            >
                              View full image ↗
                            </button>
                          </div>
                        </article>

                        <article className="flex min-h-0 flex-col rounded-2xl border border-[#1e2a3a] bg-white/[0.04] shadow-[0_0_0_1px_rgba(56,189,248,0.06),0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                          <div className="shrink-0 border-b border-[#1e2a3a] px-3 py-2.5">
                            <p className="text-[10px] font-medium uppercase tracking-widest text-[#4a5568]">Clinical</p>
                            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <FlaskConical className="h-4 w-4 text-[#38bdf8]" strokeWidth={2} aria-hidden />
                                <span className="font-medium text-[#38bdf8]">Laboratory</span>
                              </div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                                  labHighlights.length > 0
                                    ? 'border border-[#14532d] bg-[#052e16] text-[#22c55e]'
                                    : 'border border-[#1e3a5f] bg-[#0c1a2e] text-[#38bdf8]'
                                }`}
                              >
                                {labHighlights.length > 0 ? 'Ready' : 'Awaiting'}
                              </span>
                            </div>
                          </div>
                          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-3">
                            {labHighlights.length > 0 ? (
                              <ul className="w-full max-w-full list-none space-y-1.5 p-0">
                                {labHighlights.map((row, idx) => (
                                  <li
                                    key={`${row.key}-${idx}`}
                                    className="rounded-lg border border-[#1e2a3a] bg-[#0c1a2e] px-2.5 py-1.5 text-center text-[11px] font-medium tabular-nums text-[#e2e8f0]"
                                  >
                                    <span className="text-[#38bdf8]">{row.key}:</span> {row.value}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <>
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#1e3a5f] bg-[#0c1a2e]">
                                  <FlaskConical className="h-6 w-6 text-[#38bdf8]" strokeWidth={1.75} aria-hidden />
                                </div>
                                <p className="text-sm font-medium text-[#38bdf8]">Awaiting Lab Results</p>
                                <p className="max-w-[14rem] text-center text-[11px] text-[#4a5568]">
                                  Values appear when the lab posts results
                                </p>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => setLabModalOpen(true)}
                              className="rounded-md border border-[#1e3a5f] bg-[#0c1a2e] px-3 py-1.5 text-[11px] text-[#38bdf8] transition-colors hover:border-[#2d4a6a] hover:bg-[#0f2138]"
                            >
                              View partial report ↗
                            </button>
                          </div>
                        </article>

                        <article className="flex min-h-0 flex-col rounded-2xl border border-[#1e2a3a] bg-white/[0.04] shadow-[0_0_0_1px_rgba(56,189,248,0.06),0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                          <div className="shrink-0 border-b border-[#1e2a3a] px-3 py-2.5">
                            <p className="text-[10px] font-medium uppercase tracking-widest text-[#4a5568]">Cardiology</p>
                            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Heart className="h-4 w-4 text-rose-400" strokeWidth={2} aria-hidden />
                                <span className="font-medium text-rose-300">ECG</span>
                              </div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide ${
                                  ecgImageUrl
                                    ? 'border border-[#14532d] bg-[#052e16] text-[#22c55e]'
                                    : 'border border-[#713f12] bg-[#1c1406] text-[#f59e0b]'
                                }`}
                              >
                                {ecgImageUrl ? 'Ready' : 'Pending'}
                              </span>
                            </div>
                          </div>
                          <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
                            <button
                              type="button"
                              onClick={() => {
                                setZoom(1)
                                setRotation(0)
                                setEcgView(true)
                              }}
                              className="relative block h-28 w-full overflow-hidden rounded-lg border border-[#1e2a3a] bg-[#050608] text-left transition-opacity hover:opacity-95"
                            >
                              {ecgImageUrl ? (
                                <>
                                  <img
                                    src={ecgImageUrl}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    className="h-full w-full object-contain"
                                  />
                                  <span className="pointer-events-none absolute bottom-1.5 right-2 text-[10px] text-[#4a6080]">
                                    Tap to expand
                                  </span>
                                </>
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Heart className="h-8 w-8 text-slate-700" strokeWidth={1.25} />
                                </div>
                              )}
                            </button>
                            <div className="flex items-start gap-2 text-xs text-[#4a5568]">
                              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                              <p>{techNotesEcg || 'No technician notes for this ECG study.'}</p>
                            </div>
                          </div>
                        </article>
                      </div>

                      <div className="grid min-h-0 grid-cols-1 gap-3.5 lg:grid-cols-2 lg:items-stretch">
                        <article className="flex min-h-0 flex-col rounded-2xl border border-[#1e2a3a] bg-white/[0.04] shadow-[0_0_0_1px_rgba(56,189,248,0.06),0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                          <div className="shrink-0 border-b border-[#1e2a3a] px-3 py-2.5">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="text-[10px] font-medium uppercase tracking-widest text-[#4a5568]">Clinical</p>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-base leading-none" aria-hidden>
                                    📋
                                  </span>
                                  <span className="text-base font-medium text-[#e2e8f0]">Final Diagnosis</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#6b7280]" aria-hidden />
                                <span className="text-[11px] text-[#6b7280]">Local draft</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
                            <textarea
                              value={finalDiagnosis}
                              onChange={(e) => setFinalDiagnosis(e.target.value)}
                              placeholder="Enter confirmed diagnosis..."
                              disabled={!selectedCase}
                              className="min-h-0 w-full flex-1 resize-none rounded-lg border border-[#1a2535] bg-[#0a0f15] p-3 text-sm text-[#e2e8f0] placeholder:text-[#4a5568] focus:border-[#2d4a6a] focus:outline-none disabled:opacity-45"
                            />
                          </div>
                        </article>

                        <article className="flex min-h-0 flex-col rounded-2xl border border-[#1e2a3a] bg-white/[0.04] shadow-[0_0_0_1px_rgba(56,189,248,0.06),0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
                          <div className="shrink-0 border-b border-[#1e2a3a] px-3 py-2.5">
                            <p className="text-[10px] font-medium uppercase tracking-widest text-[#4a5568]">Orders</p>
                            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-base leading-none" aria-hidden>
                                  💊
                                </span>
                                <span className="font-medium text-[#e2e8f0]">Prescription</span>
                              </div>
                              <span className="rounded-full border border-[#1e3a5f] bg-[#0c1a2e] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#38bdf8]">
                                Pharmacy
                              </span>
                            </div>
                          </div>
                          <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
                            {prescriptionDraft.trim() || prescriptionSent ? (
                              <div className="rounded-lg border border-[#1a2535] bg-[#0a0f15] p-2.5 text-left text-xs leading-relaxed text-[#94a3b8] line-clamp-6">
                                {prescriptionDraft.trim() ||
                                  (prescriptionSent ? 'Sent to pharmacy.' : '')}
                              </div>
                            ) : (
                              <div className="rounded-lg border border-dashed border-[#1e2a3a] bg-[#080f1a] p-2.5 text-center text-xs text-[#374151]">
                                No medications added yet
                              </div>
                            )}
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setError(null)
                                  setPrescriptionModalOpen(true)
                                }}
                                disabled={!selectedCase}
                                className="w-full rounded-xl border border-[#2d5a8a] bg-gradient-to-br from-[#1a3a5c] to-[#0f2744] py-2.5 text-sm font-medium text-[#38bdf8] transition-all hover:border-[#3d6fa0] hover:from-[#1f4568] hover:to-[#123050] hover:shadow-[0_0_16px_rgba(56,189,248,0.12)] disabled:pointer-events-none disabled:opacity-40"
                              >
                                ✍ Write Prescription
                              </button>
                              {prescriptionSent ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-950/45 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                                  Sent
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      </div>

                      <div className="mt-auto flex shrink-0 flex-wrap justify-end gap-3 border-t border-[#1e2a3a] pt-3">
                        <button
                          type="button"
                          onClick={handleSaveDraft}
                          className="rounded-xl border border-[#2d3748] px-5 py-2.5 text-sm text-[#6b7280] transition-colors hover:border-[#4a5568] hover:text-[#94a3b8]"
                        >
                          Save Draft
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmitArchive}
                          disabled={submitArchiveBusy || !selectedCase}
                          className="rounded-xl bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] px-7 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(14,165,233,0.2)] transition-all hover:-translate-y-px hover:shadow-[0_0_28px_rgba(14,165,233,0.35)] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                        >
                          {submitArchiveBusy ? 'Submitting…' : 'Submit & Archive →'}
                        </button>
                      </div>
                      </div>
                    </div>
                  ) : !loading && !fetchError ? (
                    <p className="py-6 text-center text-xs text-[#6b7280]">No case selected.</p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
          </div>
        </main>

        {requestModal && selectedExamPatient && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
            onClick={() => !requestSending && setRequestModal(null)}
            role="presentation"
          >
            <div
              className="w-full max-w-md rounded-2xl border border-cyan-400/25 bg-slate-950/85 shadow-[0_0_48px_rgba(34,211,238,0.2)] backdrop-blur-xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/15 bg-white/[0.04]">
                <h2 className="text-base font-bold text-blue-400">
                  {requestModal === 'Lab'
                    ? 'Request laboratory tests'
                    : requestModal === 'Radiology'
                      ? 'Request X-Ray'
                      : requestModal === 'ECG'
                        ? 'Request ECG'
                        : 'Request Sonar / Ultrasound'}
                </h2>
                <button
                  type="button"
                  disabled={requestSending}
                  onClick={() => setRequestModal(null)}
                  className="p-1 rounded-lg text-zinc-300 hover:bg-slate-700 hover:text-white disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-xs text-slate-400">
                  Patient: <span className="text-zinc-200">{selectedExamPatient.name}</span>
                </p>
                <label className="block text-xs text-slate-400">Tests / study details</label>
                <textarea
                  value={requestContent}
                  onChange={(e) => setRequestContent(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-600 bg-[#0a0f1e] px-3 py-2 text-sm text-zinc-100 placeholder:text-slate-500 resize-none focus:outline-none focus:border-cyan-500/50"
                  placeholder="Describe the order…"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={requestSending}
                    onClick={() => setRequestModal(null)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-800/80"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={requestSending || !requestContent.trim()}
                    onClick={() => void submitDiagnosticRequest()}
                    className="flex-1 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-200 text-sm font-semibold hover:bg-cyan-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {requestSending ? 'Sending…' : 'Send request'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {prescriptionModalOpen && selectedCase && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
            onClick={() => !prescriptionSending && setPrescriptionModalOpen(false)}
            role="presentation"
          >
            <div
              className="flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-cyan-400/25 bg-slate-950/90 shadow-[0_0_56px_rgba(34,211,238,0.18)] backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-labelledby="prescription-modal-title"
            >
              <div className="flex items-center justify-between border-b border-cyan-500/15 bg-white/[0.04] px-4 py-3">
                <div>
                  <h2 id="prescription-modal-title" className="text-base font-bold text-blue-400">
                    Prescription
                  </h2>
                  <p className="text-xs text-slate-500">
                    Patient: <span className="text-zinc-200">{selectedCase.patientName}</span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={prescriptionSending}
                  onClick={() => setPrescriptionModalOpen(false)}
                  className="rounded-lg p-1 text-zinc-300 hover:bg-slate-700 hover:text-white disabled:opacity-50"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
                {prescriptionSent ? (
                  <p className="text-xs font-medium text-emerald-400/90">This prescription was sent to pharmacy.</p>
                ) : null}
                <label className="text-xs font-medium text-slate-400">Medication &amp; instructions</label>
                <textarea
                  value={prescriptionDraft}
                  onChange={(e) => setPrescriptionDraft(e.target.value)}
                  readOnly={prescriptionSent}
                  rows={14}
                  className="min-h-[280px] w-full flex-1 resize-none rounded-xl border border-slate-600/60 bg-[#0a0f1e] px-3 py-2.5 text-sm leading-relaxed text-zinc-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 disabled:opacity-80"
                  placeholder="Drug name, dose, route, frequency, duration…"
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={prescriptionSending}
                    onClick={() => setPrescriptionModalOpen(false)}
                    className="flex-1 rounded-xl border border-slate-600 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800/80 sm:flex-none sm:px-6"
                  >
                    Close
                  </button>
                  {!prescriptionSent ? (
                    <button
                      type="button"
                      disabled={prescriptionSending || !prescriptionDraft.trim()}
                      onClick={() => void sendPrescriptionToPharmacy()}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                    >
                      <Send className="h-4 w-4" />
                      {prescriptionSending ? 'Sending…' : 'Send to Pharmacy'}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        )}

        {imagingView && selectedCase && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 animate-in fade-in duration-200">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3">
              <span className="text-sm text-slate-200 truncate">
                {imagingView === 'xray' ? 'X-Ray' : 'Ultrasound / Sonar'} — {selectedCase.patientName}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                  className="p-2 rounded-lg border border-slate-600 text-slate-200"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
                  className="p-2 rounded-lg border border-slate-600 text-slate-200"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-2 rounded-lg border border-slate-600 text-slate-200"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1)
                    setRotation(0)
                  }}
                  className="px-2 py-1.5 rounded-lg text-xs text-slate-400 border border-slate-600"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setImagingView(null)}
                  className="p-2 rounded-lg border border-slate-600 text-slate-200 ml-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 overflow-y-auto overflow-x-hidden">
              {modalImageUrl ? (
                <img
                  src={modalImageUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[min(70vh,720px)] object-contain transition-transform duration-150"
                  style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                />
              ) : (
                <div
                  className={`flex max-h-[min(70vh,480px)] w-full max-w-lg flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 ${
                    imagingView === 'xray'
                      ? 'border-slate-600 bg-slate-900/80'
                      : 'border-cyan-800/50 bg-slate-900/80'
                  }`}
                >
                  {imagingView === 'xray' ? (
                    <ScanLine className="h-16 w-16 text-blue-400/80" strokeWidth={1.25} />
                  ) : (
                    <Waves className="h-16 w-16 text-cyan-400/80" strokeWidth={1.35} />
                  )}
                  <p className="text-center text-sm font-semibold text-zinc-300">
                    {imagingView === 'xray' ? 'Awaiting X-Ray study' : 'Awaiting Sonar / Ultrasound study'}
                  </p>
                  <p className="text-center text-xs text-zinc-500 max-w-sm">
                    No image on file yet. Zoom and rotate will apply when an image is available.
                  </p>
                </div>
              )}
              {activeImaging?.summary ? (
                <p className="mt-4 text-sm text-slate-400 max-w-3xl text-center px-4">{activeImaging.summary}</p>
              ) : null}
              {(imagingView === 'xray' ? techNotesX : techNotesS) ? (
                <div className="mt-4 w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400/90 mb-1.5">
                    Technician notes
                  </p>
                  <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                    {imagingView === 'xray' ? techNotesX : techNotesS}
                  </p>
                </div>
              ) : (
                <div className="mt-4 w-full max-w-3xl rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
                    Technician notes
                  </p>
                  <p className="text-sm text-slate-500">None recorded for this study.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {ecgView && selectedCase && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3">
              <span className="truncate text-sm text-slate-200">
                ECG — {selectedCase.patientName}
              </span>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => setZoom((z) => Math.min(3, z + 0.2))} className="rounded-lg border border-slate-600 p-2 text-slate-200">
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))} className="rounded-lg border border-slate-600 p-2 text-slate-200">
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setRotation((r) => (r + 90) % 360)} className="rounded-lg border border-slate-600 p-2 text-slate-200">
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1)
                    setRotation(0)
                  }}
                  className="rounded-lg border border-slate-600 px-2 py-1.5 text-xs text-slate-400"
                >
                  Reset
                </button>
                <button type="button" onClick={() => setEcgView(false)} className="ml-1 rounded-lg border border-slate-600 p-2 text-slate-200">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto p-4">
              {ecgImageUrl ? (
                <img
                  src={ecgImageUrl}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="max-h-[min(70vh,720px)] max-w-full object-contain transition-transform duration-150"
                  style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                />
              ) : (
                <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-rose-800/50 bg-slate-900/80 p-10">
                  <Heart className="h-16 w-16 text-rose-400/80" strokeWidth={1.25} />
                  <p className="text-center text-sm font-semibold text-zinc-300">Awaiting ECG study</p>
                </div>
              )}
              {selectedCase?.ecg?.technicianNotes?.trim() ? (
                <div className="mt-4 w-full max-w-3xl rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3">
                  <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-400/90">Technician notes</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{selectedCase.ecg.technicianNotes}</p>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {labModalOpen && selectedCase && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setLabModalOpen(false)}
            role="presentation"
          >
            <div
              className="w-full max-w-lg max-h-[90vh] rounded-2xl border border-slate-600 bg-[#161e31] shadow-2xl shadow-black/60 overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-[#111827]">
                <h2 className="text-base font-bold text-blue-400">Laboratory report</h2>
                <button
                  type="button"
                  onClick={() => setLabModalOpen(false)}
                  className="p-1 rounded-lg text-zinc-300 hover:bg-slate-700 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-4 text-zinc-200">
                {labRows.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-zinc-400 border-b border-slate-600">
                        <th className="pb-2 pr-2 font-semibold">Test</th>
                        <th className="pb-2 pr-2 font-semibold">Result</th>
                        <th className="pb-2 font-semibold">Ref.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labRows.map((row, idx) => (
                        <tr key={`${row.key}-${idx}`} className="border-b border-slate-700/80">
                          <td className="py-2 pr-2 font-medium text-white">{row.key}</td>
                          <td className="py-2 pr-2 tabular-nums text-zinc-100">{row.value}</td>
                          <td className="py-2 text-zinc-500 text-xs">{referenceRangeForTest(row.key)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-zinc-400 text-center py-8 text-base">No laboratory results.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}

export default function DoctorDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen max-h-screen items-center justify-center bg-[#0a0f1e] text-slate-400 text-sm">
          Loading…
        </div>
      }
    >
      <DoctorDashboardInner />
    </Suspense>
  )
}
