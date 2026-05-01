'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Activity, LayoutDashboard } from 'lucide-react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import ERRoleSidebar from '@/components/emergency/ERRoleSidebar'
import BackButton from '@/components/BackButton'
import { USER_ROLES } from '@/contexts/AuthContext'
import type { ERPatient } from '@/types/er'

export default function ERDashboardPage() {
  const [patients, setPatients] = useState<ERPatient[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/emergency/patients')
      const data = await res.json()
      setPatients(Array.isArray(data) ? data : [])
    } catch {
      setPatients([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void load()
    }, 20000)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  const beds = patients.filter((p) => p.bedNumber != null).length
  const waiting = patients.filter(
    (p) => p.status === 'WITH_DOCTOR' || p.status === 'WAITING_FOR_DOCTOR'
  ).length
  const tasksPending = patients.filter((p) => p.nurseTasksPending).length

  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.DOCTOR, USER_ROLES.ADMIN]} redirectTo="/login">
      <div className="flex h-screen overflow-hidden bg-slate-950">
        <ERRoleSidebar />
        <div className="min-w-0 flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10">
                <LayoutDashboard className="h-7 w-7 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-100">ER Dashboard</h1>
                <p className="text-sm text-slate-400">Live snapshot · synced from shared ER visits</p>
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-16 text-slate-500">Loading…</div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Beds in use</p>
                  <p className="mt-2 text-3xl font-bold text-cyan-300">{beds}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Waiting for doctor</p>
                  <p className="mt-2 text-3xl font-bold text-amber-300">{waiting}</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Open floor tasks</p>
                  <p className="mt-2 text-3xl font-bold text-violet-300">{tasksPending}</p>
                </div>
              </div>
            )}
            <Link
              href="/er/clinic"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/15 py-4 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/25"
            >
              <Activity className="h-5 w-5" />
              Open ER Clinic
            </Link>
          </div>
        </div>
        <BackButton />
      </div>
    </ProtectedRoute>
  )
}
