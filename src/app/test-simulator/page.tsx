'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import BackButton from '@/components/BackButton'
import { USER_ROLES } from '@/contexts/AuthContext'
import { FlaskConical, Radiation, Waves, RotateCcw } from 'lucide-react'

type SimDepartment = 'Radiology' | 'Sonar' | 'Lab'

type LabRequest = { at: string; testType: string; status: string }
type BedRow = {
  bedNumber: number
  visitId: string | null
  patientName: string | null
  labRequests: LabRequest[]
}

export default function TestSimulatorPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<SimDepartment | 'reset' | null>(null)
  const [sonarQueueRows, setSonarQueueRows] = useState<
    { bedNumber: number; patientName: string; visitId: string; testType: string; status: string }[]
  >([])

  const loadSonarQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/lab/er-beds?department=Sonar')
      const beds = (await res.json().catch(() => [])) as BedRow[]
      if (!Array.isArray(beds)) {
        setSonarQueueRows([])
        return
      }
      const rows: typeof sonarQueueRows = []
      for (const b of beds) {
        if (!b.visitId || !b.patientName) continue
        for (const r of b.labRequests || []) {
          rows.push({
            bedNumber: b.bedNumber,
            patientName: b.patientName,
            visitId: b.visitId,
            testType: r.testType || 'Sonar',
            status: r.status,
          })
        }
      }
      setSonarQueueRows(rows)
    } catch {
      setSonarQueueRows([])
    }
  }, [])

  useEffect(() => {
    void loadSonarQueue()
    const t = setInterval(() => void loadSonarQueue(), 4000)
    return () => clearInterval(t)
  }, [loadSonarQueue])

  const runSimulator = async (department: SimDepartment) => {
    setError(null)
    setMessage(null)
    setBusy(department)
    try {
      const res = await fetch('/api/test-simulator/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department }),
      })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string; error?: string }
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Simulation failed')
      }
      setMessage(data.message || 'Data sent from Device to ZION Server successfully!')
      if (department === 'Sonar') void loadSonarQueue()
      if (typeof BroadcastChannel !== 'undefined' && (department === 'Radiology' || department === 'Sonar' || department === 'Lab')) {
        new BroadcastChannel('zion-diagnostic').postMessage({ type: 'simulate-success', department })
      }
    } catch (e) {
      setError((e as Error)?.message || 'Failed to simulate')
    } finally {
      setBusy(null)
    }
  }

  const resetAll = async () => {
    setError(null)
    setMessage(null)
    setBusy('reset')
    try {
      const res = await fetch('/api/test-simulator/reset', { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string; error?: string }
      if (!res.ok || data.error) throw new Error(data.error || 'Reset failed')
      setMessage(data.message || 'All simulated data reset.')
    } catch (e) {
      setError((e as Error)?.message || 'Failed to reset')
    } finally {
      setBusy(null)
    }
  }

  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.RADIOLOGY_TECH, USER_ROLES.LAB_TECH]}>
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-100">ZION Testing / Simulator Dashboard</h1>
                  <p className="text-sm text-slate-400">Device simulation controls for Radiology, Sonar, and Lab</p>
                </div>
                <button
                  type="button"
                  onClick={resetAll}
                  disabled={busy === 'reset'}
                  className="px-4 py-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-sm font-medium hover:bg-rose-500/30 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  {busy === 'reset' ? 'Resetting...' : 'Reset All'}
                </button>
              </div>

              {message && (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">
                  {message}
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <section className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Radiation className="h-5 w-5 text-sky-300" />
                    <h2 className="text-sm font-semibold text-slate-200">Radiology Simulator</h2>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">Assign chest X-ray image to first pending patient.</p>
                  <button
                    type="button"
                    onClick={() => runSimulator('Radiology')}
                    disabled={busy === 'Radiology'}
                    className="w-full px-3 py-2 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 text-sm font-medium hover:bg-sky-500/30 disabled:opacity-50"
                  >
                    {busy === 'Radiology' ? 'Processing...' : 'Simulate X-Ray Machine'}
                  </button>
                </section>

                <section className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FlaskConical className="h-5 w-5 text-amber-300" />
                    <h2 className="text-sm font-semibold text-slate-200">Lab Simulator</h2>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">Inject blood values: HB 14.2, WBC 6500.</p>
                  <button
                    type="button"
                    onClick={() => runSimulator('Lab')}
                    disabled={busy === 'Lab'}
                    className="w-full px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-medium hover:bg-amber-500/30 disabled:opacity-50"
                  >
                    {busy === 'Lab' ? 'Processing...' : 'Simulate Blood Analyzer'}
                  </button>
                </section>

                <section className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Waves className="h-5 w-5 text-violet-300" />
                    <h2 className="text-sm font-semibold text-slate-200">Sonar Simulator</h2>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    Creates or reuses a <span className="text-violet-200 font-medium">SONAR_REQUESTED</span> order and sets{' '}
                    <span className="text-violet-200 font-medium">patient.sonarStatus = COMPLETE</span> with a demo
                    sonarImage so the Doctor dashboard shows the study immediately. Technicians can still process the
                    formal queue on Imaging.
                  </p>
                  <button
                    type="button"
                    onClick={() => runSimulator('Sonar')}
                    disabled={busy === 'Sonar'}
                    className="w-full px-3 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-300 text-sm font-medium hover:bg-violet-500/30 disabled:opacity-50"
                  >
                    {busy === 'Sonar' ? 'Processing...' : 'Simulate Sonar (queue request)'}
                  </button>
                </section>
              </div>

              <section className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Waves className="h-5 w-5 text-cyan-300" />
                  <h2 className="text-sm font-semibold text-slate-200">Sonar queue (live)</h2>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Pulled from <code className="text-slate-400">/api/lab/er-beds?department=Sonar</code>. Pending rows need
                  technician upload + review.
                </p>
                {sonarQueueRows.length === 0 ? (
                  <p className="text-sm text-slate-500">No sonar rows — click Simulate Sonar or request sonar from ER.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-800/80">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-800">
                          <th className="py-2 px-2">Bed</th>
                          <th className="py-2 px-2">Patient</th>
                          <th className="py-2 px-2">Type</th>
                          <th className="py-2 px-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sonarQueueRows.map((row, i) => (
                          <tr key={`${row.visitId}-${row.testType}-${i}`} className="border-b border-slate-800/60 text-slate-300">
                            <td className="py-2 px-2 tabular-nums">{row.bedNumber}</td>
                            <td className="py-2 px-2">{row.patientName}</td>
                            <td className="py-2 px-2">{row.testType}</td>
                            <td className="py-2 px-2">
                              <span
                                className={
                                  row.status === 'Pending'
                                    ? 'text-amber-300'
                                    : 'text-emerald-400'
                                }
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
      <BackButton />
    </ProtectedRoute>
  )
}
