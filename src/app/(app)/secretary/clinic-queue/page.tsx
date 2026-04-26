'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import { USER_ROLES } from '@/contexts/AuthContext'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

type ClinicRow = {
  visitId: string
  fileNo: string
  patientName: string
  phone: string
  assignedDoctor: string
  arrivalAt: string
  status: 'Waiting' | 'In_Consultation'
}

export default function SecretaryClinicQueuePage() {
  const { user } = useAuth()
  const router = useRouter()
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<ClinicRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyVisitId, setBusyVisitId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    if (user.role === USER_ROLES.ADMIN) return
    if (user.role === USER_ROLES.SECRETARY && user.email.toLowerCase() === 'secretary@zionmed.com') return
    router.replace('/login')
  }, [router, user])

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/secretary/clinic-queue?q=${encodeURIComponent(q)}`)
      const data = await res.json().catch(() => [])
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Failed to fetch clinic queue')
      setRows(Array.isArray(data) ? (data as ClinicRow[]) : [])
      setError(null)
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Failed to fetch clinic queue')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    void load()
    const id = window.setInterval(() => void load(), 10000)
    return () => window.clearInterval(id)
  }, [load])

  const onDirectToClinic = async (visitId: string) => {
    try {
      setBusyVisitId(visitId)
      const res = await fetch('/api/secretary/clinic-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || 'Failed to update status')
      }
      setRows((prev) =>
        prev.map((r) => (r.visitId === visitId ? { ...r, status: 'In_Consultation' } : r))
      )
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Failed to update status')
    } finally {
      setBusyVisitId(null)
    }
  }

  const title = useMemo(() => `Clinic Queue (${rows.length})`, [rows.length])

  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.SECRETARY, USER_ROLES.ADMIN]} redirectTo="/login">
      <div className="flex h-screen overflow-hidden bg-slate-950">
        <SmartSidebar />
        <main className="min-w-0 flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-6xl space-y-4">
            <div className="border-b border-slate-800 pb-4">
              <h1 className="text-2xl font-bold text-slate-100">{title}</h1>
              <p className="text-sm text-slate-400">Patient coordination only · auto refresh every 10s</p>
            </div>

            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by name or phone"
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
              />
            </div>

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}

            <div className="overflow-hidden rounded-xl border border-slate-800">
              <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="bg-slate-900/80 text-slate-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Patient Name</th>
                    <th className="px-4 py-3 text-left font-medium">File No</th>
                    <th className="px-4 py-3 text-left font-medium">Phone</th>
                    <th className="px-4 py-3 text-left font-medium">Doctor / Clinic</th>
                    <th className="px-4 py-3 text-left font-medium">Arrival</th>
                    <th className="px-4 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Loading...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        No waiting clinic patients.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => (
                      <tr key={row.visitId} className="text-slate-200">
                        <td className="px-4 py-3 font-semibold">{row.patientName}</td>
                        <td className="px-4 py-3 font-mono text-xs text-cyan-300">{row.fileNo}</td>
                        <td className="px-4 py-3">{row.phone || '—'}</td>
                        <td className="px-4 py-3">{row.assignedDoctor}</td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {new Date(row.arrivalAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            disabled={busyVisitId === row.visitId || row.status === 'In_Consultation'}
                            onClick={() => void onDirectToClinic(row.visitId)}
                            className="rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/25 disabled:opacity-50"
                          >
                            {busyVisitId === row.visitId
                              ? 'Sending...'
                              : row.status === 'In_Consultation'
                                ? 'In Progress'
                                : 'Direct to Clinic'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
