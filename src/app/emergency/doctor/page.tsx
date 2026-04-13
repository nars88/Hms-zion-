'use client'

import { useEffect, useState, useRef, type ElementType } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  Activity,
  BedDouble,
  Stethoscope,
  Pill,
  FlaskConical,
  LogOut,
  X,
  Save,
  Send,
  CheckCircle,
  FileText,
  LayoutDashboard,
  Users,
  ClipboardList,
  ListOrdered,
  Search,
  Thermometer,
  Heart,
  Scale,
} from 'lucide-react'
import BackButton from '@/components/BackButton'
import SidebarFooter from '@/components/shared/SidebarFooter'
import { useAuth } from '@/contexts/AuthContext'
import type { ERPatient, ResultCardType, Severity } from '@/types/er'

const TOTAL_BEDS = 12

type ERView = 'dashboard' | 'queue' | 'triage' | 'patients'

/** Dev bypass: mock ER doctor so dashboard loads without login */
const MOCK_ER_DOCTOR = {
  id: 'er-doctor-dev',
  name: 'Emergency Doctor',
  email: 'doctor@zion.med',
  role: 'DOCTOR' as const,
  roleTitle: 'ER Doctor',
}

export default function ERDoctorPage() {
  const { user, login } = useAuth()
  const searchParams = useSearchParams()
  const view = (searchParams.get('view') as ERView) || 'dashboard'
  const validView: ERView = ['dashboard', 'queue', 'triage', 'patients'].includes(view) ? view : 'dashboard'

  useEffect(() => {
    if (!user) {
      login(MOCK_ER_DOCTOR)
    }
  }, [user, login])

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <ERDoctorSidebar currentView={validView} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6">
          {validView === 'dashboard' && <ERDoctorDashboard />}
          {validView === 'queue' && <ERQueueView />}
          {validView === 'triage' && <ERTriageView />}
          {validView === 'patients' && <ERPatientsView />}
        </main>
      </div>
      <BackButton />
    </div>
  )
}

/** Sidebar for ER Doctor: Dashboard, Queue, Triage, Patients — ZION theme, isActive from view */
function ERDoctorSidebar({ currentView }: { currentView: ERView }) {
  const items: { view: ERView; label: string; icon: ElementType }[] = [
    { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { view: 'queue', label: 'Queue', icon: ListOrdered },
    { view: 'triage', label: 'Triage', icon: ClipboardList },
    { view: 'patients', label: 'Patients', icon: Users },
  ]
  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-slate-950/90 backdrop-blur-md border-r border-slate-800" dir="ltr">
      <div className="p-4 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <Stethoscope size={18} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Emergency</p>
            <p className="text-sm font-semibold text-slate-100">ER Doctor</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-4 px-3 flex flex-col gap-2">
        {items.map((item) => {
          const isActive = currentView === item.view
          const href = item.view === 'dashboard' ? '/emergency/doctor' : `/emergency/doctor?view=${item.view}`
          const Icon = item.icon
          return (
            <Link
              key={item.view}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/30' : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-50 border border-transparent'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="flex-shrink-0 border-t border-slate-800 flex flex-col">
        <p className="text-[11px] text-slate-500 px-4 pt-3 pb-1">ZION HMS · ER</p>
        <SidebarFooter />
      </div>
    </aside>
  )
}

/** Queue: list of patients with urgency levels (Red, Yellow, Green) */
function ERQueueView() {
  const [patients, setPatients] = useState<ERPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      try {
        const res = await fetch('/api/emergency/patients')
        if (!res.ok) throw new Error('Failed to load patients')
        const raw = await res.json()
        const data: ERPatient[] = Array.isArray(raw) ? raw : []
        if (!cancelled) setPatients(data)
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  const urgencyLabel = (level: number | null) => (level === 1 ? 'Red' : level === 2 ? 'Yellow' : 'Green')
  const sorted = [...patients].sort((a, b) => (a.triageLevel ?? 4) - (b.triageLevel ?? 4))

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-800/60 pb-4">
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
          <ListOrdered className="h-7 w-7 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Queue</h1>
          <p className="text-sm text-slate-400">Waiting patients by urgency (Red → Yellow → Green)</p>
        </div>
      </div>
      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-400">{error}</div>
      )}
      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 flex items-center justify-center gap-3 text-slate-400">
          <div className="h-5 w-5 rounded-full border-2 border-cyan-500/40 border-t-cyan-400 animate-spin" />
          Loading queue...
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/30">
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Urgency</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Patient</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Chief Complaint</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Bed</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">No patients in queue</td></tr>
              ) : (
                sorted.map((p) => (
                  <tr key={p.visitId} className="border-b border-slate-800/80 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold ${
                        p.triageLevel === 1 ? 'bg-red-500/25 text-red-200 border border-red-500/40' : p.triageLevel === 2 ? 'bg-amber-500/25 text-amber-200 border border-amber-500/40' : 'bg-emerald-500/25 text-emerald-200 border border-emerald-500/40'
                      }`}>
                        {urgencyLabel(p.triageLevel)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-white">{p.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{p.chiefComplaint || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{p.bedNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{p.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Triage: quick entry form for Vitals (Pulse, BP, Temp) */
function ERTriageView() {
  const [patients, setPatients] = useState<ERPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null)
  const [vitals, setVitals] = useState({ pulse: '', bp: '', temp: '', rr: '', weight: '', notes: '' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/emergency/patients')
      .then((res) => res.ok ? res.json() : [])
      .then((raw: ERPatient[]) => {
        if (!cancelled) setPatients(Array.isArray(raw) ? raw : [])
      })
      .catch(() => { if (!cancelled) setPatients([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const selected = patients.find((p) => p.visitId === selectedVisitId)

  const handleSaveVitals = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-800/60 pb-4">
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
          <ClipboardList className="h-7 w-7 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Triage</h1>
          <p className="text-sm text-slate-400">Quick entry: Pulse, BP, Temp and initial assessment</p>
        </div>
      </div>
      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 flex items-center justify-center gap-3 text-slate-400">
          <div className="h-5 w-5 rounded-full border-2 border-cyan-500/40 border-t-cyan-400 animate-spin" />
          Loading...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Select patient</h2>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {patients.length === 0 ? (
                <p className="text-slate-500 text-sm">No ER patients</p>
              ) : (
                patients.map((p) => (
                  <button
                    key={p.visitId}
                    type="button"
                    onClick={() => setSelectedVisitId(p.visitId)}
                    className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all ${
                      selectedVisitId === p.visitId ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30' : 'text-slate-300 hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    {p.name} — Bed {p.bedNumber ?? '—'}
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <Activity size={16} /> Vitals — Quick entry
            </h2>
            {selected ? (
              <p className="text-xs text-cyan-400/90 mb-4">Patient: {selected.name}</p>
            ) : (
              <p className="text-xs text-slate-500 mb-4">Select a patient to record vitals</p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><Heart size={12} /> Pulse (bpm)</label>
                <input type="text" value={vitals.pulse} onChange={(e) => setVitals((v) => ({ ...v, pulse: e.target.value }))} placeholder="72" className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">BP (mmHg)</label>
                <input type="text" value={vitals.bp} onChange={(e) => setVitals((v) => ({ ...v, bp: e.target.value }))} placeholder="120/80" className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><Thermometer size={12} /> Temp (°C)</label>
                <input type="text" value={vitals.temp} onChange={(e) => setVitals((v) => ({ ...v, temp: e.target.value }))} placeholder="36.6" className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 outline-none" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">RR (/min)</label>
                <input type="text" value={vitals.rr} onChange={(e) => setVitals((v) => ({ ...v, rr: e.target.value }))} placeholder="16" className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><Scale size={12} /> Weight (kg)</label>
                <input type="text" value={vitals.weight} onChange={(e) => setVitals((v) => ({ ...v, weight: e.target.value }))} placeholder="70" className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Initial assessment / Notes</label>
                <textarea value={vitals.notes} onChange={(e) => setVitals((v) => ({ ...v, notes: e.target.value }))} placeholder="Brief notes..." rows={3} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 resize-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 outline-none" />
              </div>
            </div>
            <button type="button" onClick={handleSaveVitals} className="mt-4 px-5 py-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-sm font-medium hover:bg-cyan-500/30 transition-colors">
              {saved ? 'Saved' : 'Save vitals'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Patients: searchable ER patient history table */
function ERPatientsView() {
  const [patients, setPatients] = useState<ERPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/emergency/patients')
      .then((res) => res.ok ? res.json() : [])
      .then((raw: ERPatient[]) => {
        if (!cancelled) setPatients(Array.isArray(raw) ? raw : [])
      })
      .catch(() => { if (!cancelled) setPatients([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const q = search.trim().toLowerCase()
  const filtered = q
    ? patients.filter((p) => p.name.toLowerCase().includes(q) || (p.patientId && p.patientId.toLowerCase().includes(q)) || (p.chiefComplaint && p.chiefComplaint.toLowerCase().includes(q)))
    : patients

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <Users className="h-7 w-7 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Patients</h1>
            <p className="text-sm text-slate-400">ER patient history — search by name or ID</p>
          </div>
        </div>
        <div className="relative w-72">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, ID, complaint..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 outline-none"
          />
        </div>
      </div>
      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-8 flex items-center justify-center gap-3 text-slate-400">
          <div className="h-5 w-5 rounded-full border-2 border-cyan-500/40 border-t-cyan-400 animate-spin" />
          Loading history...
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/30">
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Patient</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Chief Complaint</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Bed</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">{search ? 'No matches' : 'No patients in history'}</td></tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.visitId} className="border-b border-slate-800/80 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-white">{p.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-400 font-mono">{p.patientId}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{p.chiefComplaint || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{p.bedNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{p.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ERDoctorDashboard() {
  const [patients, setPatients] = useState<ERPatient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'alert' } | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedBedNumber, setSelectedBedNumber] = useState<number | null>(null)
  const [resultCard, setResultCard] = useState<{ type: ResultCardType; patient: ERPatient } | null>(null)
  const [requestModal, setRequestModal] = useState<{
    visitId: string
    patientId: string
    patientName: string
    bedNumber: number
    department: 'Lab' | 'Radiology' | 'Sonar'
  } | null>(null)
  const { user } = useAuth()
  const prevUnreviewedRef = useRef<Set<string>>(new Set())

  const fetchPatients = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/emergency/patients')
      if (!res.ok) throw new Error('Failed to load ER patients')
      const raw = await res.json()
      const data: ERPatient[] = Array.isArray(raw) ? raw : []
      const prev = prevUnreviewedRef.current
      const next = new Set<string>()
      data.forEach((p) => {
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
    } catch (e: unknown) {
      const err = e as Error
      setError(err?.message || 'Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPatients()
    const interval = setInterval(fetchPatients, 12000)
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
  const completedDiagnostics = patients
    .flatMap((p) => {
      const rows: Array<{
        key: string
        patientName: string
        bedNumber: number | null
        type: 'Lab' | 'X-Ray' | 'Sonar'
        summary: string
        attachmentPath?: string
        technicianNotes?: string
      }> = []
      if (p.labDiagnostic) {
        rows.push({
          key: `${p.visitId}-lab`,
          patientName: p.name,
          bedNumber: p.bedNumber,
          type: 'Lab',
          summary: p.labDiagnostic.summary || 'Result available',
          attachmentPath: p.labDiagnostic.attachmentPath,
        })
      }
      if (p.radiologyDiagnostic) {
        rows.push({
          key: `${p.visitId}-radiology`,
          patientName: p.name,
          bedNumber: p.bedNumber,
          type: 'X-Ray',
          summary: p.radiologyDiagnostic.summary || 'Result available',
          attachmentPath: p.radiologyDiagnostic.attachmentPath,
          technicianNotes: p.radiologyDiagnostic.technicianNotes,
        })
      }
      if (p.sonarDiagnostic) {
        rows.push({
          key: `${p.visitId}-sonar`,
          patientName: p.name,
          bedNumber: p.bedNumber,
          type: 'Sonar',
          summary: p.sonarDiagnostic.summary || 'Result available',
          attachmentPath: p.sonarDiagnostic.attachmentPath,
          technicianNotes: p.sonarDiagnostic.technicianNotes,
        })
      }
      return rows
    })
    .slice(0, 10)

  const openDrawer = (bedNum: number) => {
    const patient = bedMap.get(bedNum)
    if (!patient) {
      showToast('No patient in this bed.', 'alert')
      return
    }
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <BedDouble className="h-7 w-7 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">ER Doctor Dashboard</h1>
            <p className="text-sm text-slate-400">View vitals, orders, send to Pharmacy / Lab, discharge</p>
          </div>
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

      <section>
        <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Completed Diagnostics
        </h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/30">
                <th className="px-4 py-2.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider">Patient</th>
                <th className="px-4 py-2.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider">Bed</th>
                <th className="px-4 py-2.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-2.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider">Summary</th>
                <th className="px-4 py-2.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider">Tech notes</th>
                <th className="px-4 py-2.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider">Attachment</th>
              </tr>
            </thead>
            <tbody>
              {completedDiagnostics.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No completed diagnostics yet.</td>
                </tr>
              ) : (
                completedDiagnostics.map((scan) => (
                  <tr key={scan.key} className="border-b border-slate-800/70">
                    <td className="px-4 py-2.5 text-sm text-slate-200">{scan.patientName}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-400">{scan.bedNumber ?? '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-300">{scan.type}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-400 max-w-[320px] truncate">{scan.summary}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-400 max-w-[220px] truncate">
                      {scan.type !== 'Lab' && scan.technicianNotes ? scan.technicianNotes : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-sm">
                      {scan.attachmentPath ? (
                        <a
                          href={scan.attachmentPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Bed Grid — Click occupied bed to open orders
        </h2>
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {Array.from({ length: TOTAL_BEDS }, (_, i) => (
              <div key={i} className="h-36 rounded-xl border border-slate-800/60 bg-slate-900/40 animate-pulse" />
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
                      ? 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-800/60 cursor-default'
                      : severity === 'Red'
                      ? 'bg-red-500/15 border-red-500/40 hover:bg-red-500/20'
                      : severity === 'Yellow'
                      ? 'bg-amber-500/15 border-amber-500/40 hover:bg-amber-500/20'
                      : 'bg-emerald-500/15 border-emerald-500/40 hover:bg-emerald-500/20'
                  }`}
                >
                  <div className="p-3 flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-400">Bed {bedNum}</span>
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
                      <span className="text-sm text-slate-500">Available</span>
                    ) : (
                      <>
                        <span className="text-sm font-semibold text-slate-100 truncate">{patient!.name}</span>
                        <span className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {patient!.chiefComplaint || '—'}
                        </span>
                        {/* Quick Actions — request Lab / X-Ray / Sonar without opening drawer */}
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-slate-500 mr-0.5">Quick:</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setRequestModal({
                                visitId: patient!.visitId,
                                patientId: patient!.patientId,
                                patientName: patient!.name,
                                bedNumber: patient!.bedNumber!,
                                department: 'Lab',
                              })
                            }}
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-700/60 text-slate-300 hover:bg-slate-600/80 border border-slate-600/60"
                          >
                            🧪 Lab
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setRequestModal({
                                visitId: patient!.visitId,
                                patientId: patient!.patientId,
                                patientName: patient!.name,
                                bedNumber: patient!.bedNumber!,
                                department: 'Radiology',
                              })
                            }}
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-700/60 text-slate-300 hover:bg-slate-600/80 border border-slate-600/60"
                          >
                            🩻 X-Ray
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setRequestModal({
                                visitId: patient!.visitId,
                                patientId: patient!.patientId,
                                patientName: patient!.name,
                                bedNumber: patient!.bedNumber!,
                                department: 'Sonar',
                              })
                            }}
                            className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-700/60 text-slate-300 hover:bg-slate-600/80 border border-slate-600/60"
                          >
                            🔉 Sonar
                          </button>
                        </div>
                        <span className="mt-1.5 flex items-center gap-1.5 text-[10px] flex-wrap">
                          <span
                            title={patient!.labReady ? (patient!.labUnreviewed ? 'New result – click to review' : 'Lab result') : patient!.hasLabRequest ? 'Lab – Pending' : 'Lab'}
                            onClick={(e) => { e.stopPropagation(); openResultModal('Lab', patient!) }}
                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 transition-all ${
                              patient!.labReady
                                ? `cursor-pointer text-emerald-400 hover:bg-emerald-500/20 ${patient!.labUnreviewed ? 'animate-pulse bg-emerald-500/20' : ''}`
                                : patient!.hasLabRequest
                                ? 'text-amber-400 cursor-default'
                                : 'text-slate-500 cursor-default'
                            }`}
                          >
                            🧪 {patient!.labReady ? (patient!.labUnreviewed ? 'New' : 'Ready') : patient!.hasLabRequest ? 'Pending' : 'Lab'}
                          </span>
                          <span
                            title={patient!.radiologyReady ? (patient!.radiologyUnreviewed ? 'New result – click to review' : 'X-Ray result') : patient!.hasRadiologyRequest ? 'X-Ray – Pending' : 'X-Ray'}
                            onClick={(e) => { e.stopPropagation(); openResultModal('Radiology', patient!) }}
                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 transition-all ${
                              patient!.radiologyReady
                                ? `cursor-pointer text-emerald-400 hover:bg-emerald-500/20 ${patient!.radiologyUnreviewed ? 'animate-pulse bg-emerald-500/20' : ''}`
                                : patient!.hasRadiologyRequest
                                ? 'text-amber-400 cursor-default'
                                : 'text-slate-500 cursor-default'
                            }`}
                          >
                            🩻 {patient!.radiologyReady ? (patient!.radiologyUnreviewed ? 'New' : 'Ready') : patient!.hasRadiologyRequest ? 'Pending' : 'X-Ray'}
                          </span>
                          <span
                            title={patient!.sonarReady ? (patient!.sonarUnreviewed ? 'New result – click to review' : 'Sonar result') : patient!.hasSonarRequest ? 'Sonar – Pending' : 'Sonar'}
                            onClick={(e) => { e.stopPropagation(); openResultModal('Sonar', patient!) }}
                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 transition-all ${
                              patient!.sonarReady
                                ? `cursor-pointer text-emerald-400 hover:bg-emerald-500/20 ${patient!.sonarUnreviewed ? 'animate-pulse bg-emerald-500/20' : ''}`
                                : patient!.hasSonarRequest
                                ? 'text-amber-400 cursor-default'
                                : 'text-slate-500 cursor-default'
                            }`}
                          >
                            🔉 {patient!.sonarReady ? (patient!.sonarUnreviewed ? 'New' : 'Ready') : patient!.hasSonarRequest ? 'Pending' : 'Sonar'}
                          </span>
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

      {drawerOpen && selectedBedNumber !== null && bedMap.get(selectedBedNumber) && (
        <ERDoctorDrawer
          patient={bedMap.get(selectedBedNumber)!}
          doctorId={user?.id ?? ''}
          onClose={closeDrawer}
          onSaved={fetchPatients}
          showToast={showToast}
          setError={setError}
        />
      )}

      {/* Result Card modal — shown when clicking a green Lab/X-Ray/Sonar icon */}
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
                {resultCard.type !== 'Lab' &&
                  (resultCard.type === 'Radiology'
                    ? resultCard.patient.radiologyDiagnostic?.technicianNotes
                    : resultCard.patient.sonarDiagnostic?.technicianNotes) && (
                    <div className="rounded-lg bg-slate-800/50 border border-sky-500/25 p-3">
                      <p className="text-sm font-medium text-sky-300 mb-1">Technician notes</p>
                      <pre className="text-sm text-slate-200 whitespace-pre-wrap">
                        {resultCard.type === 'Radiology'
                          ? resultCard.patient.radiologyDiagnostic?.technicianNotes
                          : resultCard.patient.sonarDiagnostic?.technicianNotes}
                      </pre>
                    </div>
                  )}
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

      {/* Quick Actions request modal — Lab / X-Ray / Sonar from bed card */}
      {requestModal && (
        <RequestDiagnosticModal
          visitId={requestModal.visitId}
          patientName={requestModal.patientName}
          bedNumber={requestModal.bedNumber}
          department={requestModal.department}
          onClose={() => setRequestModal(null)}
          onSent={() => {
            setRequestModal(null)
            fetchPatients()
          }}
          showToast={showToast}
        />
      )}
    </div>
  )
}

interface RequestDiagnosticModalProps {
  visitId: string
  patientName: string
  bedNumber: number
  department: 'Lab' | 'Radiology' | 'Sonar'
  onClose: () => void
  onSent: () => void
  showToast: (message: string, type: 'success' | 'alert') => void
}

function RequestDiagnosticModal({
  visitId,
  patientName,
  bedNumber,
  department,
  onClose,
  onSent,
  showToast,
}: RequestDiagnosticModalProps) {
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  const label = department === 'Lab' ? '🧪 Lab' : department === 'Radiology' ? '🩻 X-Ray' : '🔉 Sonar'
  const placeholder = department === 'Lab' ? 'e.g. CBC, Blood culture' : department === 'Radiology' ? 'e.g. Chest X-Ray' : 'e.g. Abdomen ultrasound'

  const handleSubmit = async () => {
    const trimmed = content.trim()
    if (!trimmed) {
      showToast('Enter tests or impression.', 'alert')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/emergency/doctor/lab-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId, content: trimmed, department }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to send request')
      }
      showToast(`${label} request sent.`, 'success')
      onSent()
    } catch (e: unknown) {
      showToast((e as Error)?.message || 'Failed to send', 'alert')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" aria-hidden onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100">
              Request {label} — Bed {bedNumber} — {patientName}
            </h3>
            <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-800">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <label className="block text-xs text-slate-400">Tests / impression</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg bg-slate-600/50 text-slate-300 text-sm font-medium hover:bg-slate-500/50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={sending || !content.trim()}
                className="flex-1 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 text-sm font-medium hover:bg-cyan-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                {sending ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

interface ERDoctorDrawerProps {
  patient: ERPatient
  doctorId: string
  onClose: () => void
  onSaved: () => void
  showToast: (message: string, type: 'success' | 'alert') => void
  setError: (e: string | null) => void
}

type DiagnosticDept = 'Lab' | 'Radiology' | 'Sonar'

function ERDoctorDrawer({ patient, doctorId, onClose, onSaved, showToast, setError }: ERDoctorDrawerProps) {
  const [medications, setMedications] = useState(patient.doctorMedications ?? '')
  const [labTests, setLabTests] = useState(patient.doctorLabTests ?? '')
  const [diagnosticDept, setDiagnosticDept] = useState<DiagnosticDept>('Lab')
  const [saving, setSaving] = useState(false)
  const [sendingPharmacy, setSendingPharmacy] = useState(false)
  const [sendingLab, setSendingLab] = useState(false)
  const [discharging, setDischarging] = useState(false)

  useEffect(() => {
    setMedications(patient.doctorMedications ?? '')
    setLabTests(patient.doctorLabTests ?? '')
  }, [patient])

  const saveOrders = async () => {
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/emergency/doctor/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: patient.visitId,
          medications: medications.trim() || undefined,
          labTests: labTests.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to save orders')
      }
      showToast('Orders saved. Nurse will see them as tasks.', 'success')
      onSaved()
    } catch (e: unknown) {
      const err = e as Error
      setError(err?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const sendToPharmacy = async () => {
    const medText = medications.trim()
    if (!medText) {
      setError('Enter medications first.')
      return
    }
    setError(null)
    setSendingPharmacy(true)
    try {
      const prescriptionItems = medText.split('\n').filter((l) => l.trim()).map((line) => {
        const parts = line.split(' - ')
        const medicinePart = parts[0] || line
        const frequency = parts[1] || 'As prescribed'
        const match = medicinePart.match(/^(.+?)\s+(\d+.*?)$/)
        return {
          medicineName: match ? match[1].trim() : medicinePart.trim(),
          dosage: match ? match[2].trim() : 'As prescribed',
          frequency: frequency.trim(),
        }
      })
      const res = await fetch('/api/doctor/visit/send-to-pharmacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: patient.visitId,
          patientId: patient.patientId,
          doctorId,
          prescriptionItems,
          diagnosis: patient.chiefComplaint || 'ER',
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to send to pharmacy')
      }
      await fetch('/api/emergency/doctor/append-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: patient.visitId, type: 'PHARMACY_SENT' }),
      }).catch(() => {})
      showToast('Sent to Pharmacy & Finance. Nurse task updated.', 'success')
      onSaved()
    } catch (e: unknown) {
      const err = e as Error
      setError(err?.message || 'Failed to send to pharmacy')
    } finally {
      setSendingPharmacy(false)
    }
  }

  const requestLab = async () => {
    const content = labTests.trim()
    if (!content) {
      setError('Enter tests / impression first.')
      return
    }
    setError(null)
    setSendingLab(true)
    try {
      const res = await fetch('/api/emergency/doctor/lab-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: patient.visitId, content, department: diagnosticDept }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to request')
      }
      const deptLabel = diagnosticDept === 'Lab' ? 'Lab' : diagnosticDept === 'Radiology' ? 'X-Ray' : 'Sonar'
      showToast(`${deptLabel} request sent.`, 'success')
      onSaved()
    } catch (e: unknown) {
      const err = e as Error
      setError(err?.message || 'Failed')
    } finally {
      setSendingLab(false)
    }
  }

  const readyForDischarge = async () => {
    setError(null)
    setDischarging(true)
    try {
      const res = await fetch('/api/emergency/doctor/ready-for-discharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: patient.visitId }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed')
      }
      showToast('Patient is now in Pending Payment. Accountant can process payment and free the bed.', 'success')
      onSaved()
      onClose()
    } catch (e: unknown) {
      const err = e as Error
      setError(err?.message || 'Failed')
    } finally {
      setDischarging(false)
    }
  }

  const handlePrintSummary = async () => {
    try {
      const res = await fetch(`/api/emergency/visit-summary?visitId=${encodeURIComponent(patient.visitId)}`)
      if (!res.ok) throw new Error('Failed to load summary')
      const data = await res.json()
      const { printMedicalSummary } = await import('@/lib/printUtils')
      printMedicalSummary(data)
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Failed to print summary')
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" aria-hidden onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-slate-900 border-l border-slate-700/80 shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-700/80 flex-shrink-0">
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-cyan-400" />
            Bed {patient.bedNumber} — {patient.name}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* View Vitals (from nurse) */}
          <section>
            <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-emerald-400" />
              Vitals (from Nurse)
            </h4>
            {patient.vitals ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-slate-800/50 px-3 py-2">
                  <span className="text-slate-500">BP</span>
                  <p className="text-slate-200 font-medium">{patient.vitals.bp}</p>
                </div>
                <div className="rounded-lg bg-slate-800/50 px-3 py-2">
                  <span className="text-slate-500">HR</span>
                  <p className="text-slate-200 font-medium">{patient.vitals.heartRate} bpm</p>
                </div>
                <div className="rounded-lg bg-slate-800/50 px-3 py-2">
                  <span className="text-slate-500">Temp</span>
                  <p className="text-slate-200 font-medium">{patient.vitals.temperature} °C</p>
                </div>
                <div className="rounded-lg bg-slate-800/50 px-3 py-2">
                  <span className="text-slate-500">Weight</span>
                  <p className="text-slate-200 font-medium">{patient.vitals.weight} kg</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No vitals recorded yet.</p>
            )}
          </section>

          {/* Doctor's Orders */}
          <section>
            <h4 className="text-sm font-semibold text-slate-200 mb-2">Doctor&apos;s Orders</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Medications (one per line, e.g. &quot;Paracetamol 500mg - TID&quot;)</label>
                <textarea
                  value={medications}
                  onChange={(e) => setMedications(e.target.value)}
                  placeholder="e.g. Paracetamol 500mg - TID"
                  rows={3}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Lab / X-Ray tests</label>
                <textarea
                  value={labTests}
                  onChange={(e) => setLabTests(e.target.value)}
                  placeholder="e.g. CBC, X-Ray Chest"
                  rows={2}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-slate-100 placeholder-slate-500 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={saveOrders}
                disabled={saving}
                className="w-full py-2 rounded-lg bg-slate-600 text-slate-200 text-sm font-medium hover:bg-slate-500 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Orders'}
              </button>
            </div>
          </section>

          {/* Action Buttons */}
          <section className="space-y-2">
            <button
              type="button"
              onClick={sendToPharmacy}
              disabled={sendingPharmacy || !medications.trim()}
              className="w-full py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 text-sm font-medium hover:bg-amber-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Pill className="h-4 w-4" />
              {sendingPharmacy ? 'Sending...' : 'Send to Pharmacy'}
            </button>
            <p className="text-[10px] text-slate-500">Sends meds to Pharmacy &amp; Finance.</p>
            {patient.pharmacyOrderStatus && (
              <div className="rounded-lg border border-slate-700/60 bg-slate-800/30 px-3 py-2">
                <p className="text-[10px] text-slate-400">Order status</p>
                <p className="text-sm font-medium text-slate-200">
                  {patient.medicineReady ? '✓ Dispensed' : patient.pharmacyOutOfStock ? '⚠️ Out of Stock' : 'Pending'}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">Send to department</label>
              <select
                value={diagnosticDept}
                onChange={(e) => setDiagnosticDept(e.target.value as DiagnosticDept)}
                className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-slate-200 text-sm"
              >
                <option value="Lab">🧪 Lab</option>
                <option value="Radiology">🩻 X-Ray (Radiology)</option>
                <option value="Sonar">📡 Sonar</option>
              </select>
            </div>
            <button
              type="button"
              onClick={requestLab}
              disabled={sendingLab || !labTests.trim()}
              className="w-full py-2.5 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 text-sm font-medium hover:bg-cyan-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FlaskConical className="h-4 w-4" />
              {sendingLab ? 'Sending...' : 'Request Diagnostic'}
            </button>
            <p className="text-[10px] text-slate-500">Notifies Lab / Radiology / Sonar.</p>

            {/* Pending diagnostic requests — Remove so it disappears from Lab/Nurse */}
            {patient.erOrders?.filter((o) => ['LAB', 'LAB_REQUESTED', 'RADIOLOGY_REQUESTED', 'SONAR_REQUESTED'].includes(o.type)).length ? (
              <div className="rounded-lg border border-slate-700/60 bg-slate-800/30 p-2 space-y-1.5">
                <p className="text-[10px] text-slate-400 font-medium">Pending requests (remove to cancel)</p>
                {patient.erOrders
                  .filter((o) => ['LAB', 'LAB_REQUESTED', 'RADIOLOGY_REQUESTED', 'SONAR_REQUESTED'].includes(o.type))
                  .map((o) => (
                    <div key={o.at} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-300 truncate">
                        {o.type === 'RADIOLOGY_REQUESTED' ? '🩻' : o.type === 'SONAR_REQUESTED' ? '📡' : '🧪'} {o.content || o.type}
                      </span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/emergency/doctor/order-remove', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ visitId: patient.visitId, at: o.at }),
                            })
                            if (res.ok) {
                              showToast('Request removed. Lab/Nurse view will update.', 'success')
                              onSaved()
                            }
                          } catch (_) {
                            setError('Failed to remove request')
                          }
                        }}
                        className="text-rose-400 hover:text-rose-300 shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
              </div>
            ) : null}

            <div className="flex gap-2">
              <Link href="/lab" className="flex-1 py-2 rounded-lg bg-slate-600/50 border border-slate-600 text-slate-300 text-sm font-medium text-center">Lab</Link>
              <Link href="/radiology" className="flex-1 py-2 rounded-lg bg-slate-600/50 border border-slate-600 text-slate-300 text-sm font-medium text-center">X-Ray</Link>
              <Link href="/radiology" className="flex-1 py-2 rounded-lg bg-slate-600/50 border border-slate-600 text-slate-300 text-sm font-medium text-center">Sonar</Link>
            </div>

            <button
              type="button"
              onClick={handlePrintSummary}
              className="w-full py-2 rounded-lg bg-slate-600/50 border border-slate-600 text-slate-300 text-sm font-medium hover:bg-slate-600 flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Print Summary
            </button>
            <p className="text-[10px] text-slate-500">Medical report (Lab, X-Ray, notes) for patient before billing.</p>

            <button
              type="button"
              onClick={readyForDischarge}
              disabled={discharging || patient.hasPendingDiagnostics || patient.billingStatus === 'waiting_for_payment'}
              title={patient.hasPendingDiagnostics ? 'Complete or remove pending Lab/X-Ray/Sonar requests first' : patient.billingStatus === 'waiting_for_payment' ? 'Already in Pending Payment' : undefined}
              className="w-full py-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-sm font-medium hover:bg-emerald-500/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              {discharging ? 'Sending...' : patient.billingStatus === 'waiting_for_payment' ? 'In Pending Payment' : 'Ready for Discharge'}
            </button>
            {patient.hasPendingDiagnostics ? (
              <p className="text-[10px] text-amber-400">Pending Lab/X-Ray/Sonar — complete or remove requests first.</p>
            ) : patient.billingStatus === 'waiting_for_payment' ? (
              <p className="text-[10px] text-emerald-400">Patient is in Accountant Pending list. Pay there to free the bed.</p>
            ) : (
              <p className="text-[10px] text-slate-500">Adds patient to Accountant Pending Payment. Bed clears after payment.</p>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
