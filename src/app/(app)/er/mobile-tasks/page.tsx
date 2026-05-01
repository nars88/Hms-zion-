'use client'

import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, CheckCircle2, LogOut, BellDot } from 'lucide-react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import { USER_ROLES, useAuth } from '@/contexts/AuthContext'
import type { ERTask } from '@/types/er'

export default function ERMobileTasksPage() {
  const { logout } = useAuth()
  const [tasks, setTasks] = useState<ERTask[]>([])
  const [finished, setFinished] = useState<ERTask[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [newTaskCount, setNewTaskCount] = useState(0)
  const [busyTaskKey, setBusyTaskKey] = useState<string | null>(null)

  const fetchTasks = useCallback(async () => {
    try {
      const [pendingRes, recentRes] = await Promise.all([
        fetch('/api/emergency/tasks'),
        fetch('/api/emergency/tasks/recent'),
      ])
      if (!pendingRes.ok) throw new Error('Failed to load tasks')
      const pendingData = (await pendingRes.json()) as ERTask[]
      const nextTasks = Array.isArray(pendingData) ? pendingData.filter((t) => t.status !== 'DONE') : []
      nextTasks.sort((a, b) => {
        const pA = a.priority === 'CRITICAL' ? 0 : 1
        const pB = b.priority === 'CRITICAL' ? 0 : 1
        if (pA !== pB) return pA - pB
        return b.at > a.at ? 1 : -1
      })

      setTasks((prev) => {
        const prevKeys = new Set(prev.map((t) => `${t.visitId}::${t.at}`))
        const incomingNew = nextTasks.filter((t) => !prevKeys.has(`${t.visitId}::${t.at}`))
        if (incomingNew.length > 0) {
          setNewTaskCount((c) => c + incomingNew.length)
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
            const o = ctx.createOscillator()
            const g = ctx.createGain()
            o.type = 'sine'
            o.frequency.value = 880
            g.gain.value = 0.05
            o.connect(g)
            g.connect(ctx.destination)
            o.start()
            o.stop(ctx.currentTime + 0.12)
          } catch {
            // non-blocking
          }
        }
        return nextTasks
      })

      if (recentRes.ok) {
        const recentData = (await recentRes.json()) as ERTask[]
        setFinished(Array.isArray(recentData) ? recentData : [])
      }
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchTasks()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void fetchTasks()
    }
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void fetchTasks()
    }, 15000)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchTasks])

  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.ER_NURSE, USER_ROLES.ADMIN]} redirectTo="/login">
      <div className="min-h-[100dvh] bg-slate-950 text-slate-100">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800/90 bg-slate-950/95 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-violet-500/40 bg-violet-500/10">
              <ClipboardList className="h-4 w-4 text-violet-300" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-100">ER Tasks</h1>
              <p className="text-[11px] text-slate-500">Updates every 10s</p>
            </div>
          </div>
          {newTaskCount > 0 ? (
            <button
              type="button"
              onClick={() => setNewTaskCount(0)}
              className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold text-cyan-200"
            >
              <BellDot className="h-3.5 w-3.5" />
              +{newTaskCount} new
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            <LogOut className="h-3.5 w-3.5" />
            Out
          </button>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-4">
          {msg && (
            <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              {msg}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <aside className="order-2 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3 lg:order-1 lg:col-span-1 lg:border-r lg:border-slate-700/80">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recently Finished</h2>
              {finished.length === 0 ? (
                <p className="text-xs text-slate-500">No completed tasks yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {finished.map((t) => (
                    <li
                      key={`done-${t.visitId}-${t.at}`}
                      className="rounded-lg border border-slate-700/70 bg-slate-900/70 px-2.5 py-2"
                    >
                      <p className="text-xs font-semibold text-slate-200">Bed {t.bedNumber ?? '?'} · {t.patientName}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">{t.content || 'Nurse task'}</p>
                    </li>
                  ))}
                </ul>
              )}
            </aside>

            <section className="order-1 min-h-[320px] lg:order-2 lg:col-span-3">
              {loading ? (
                <p className="py-12 text-center text-slate-500">Loading…</p>
              ) : tasks.length === 0 ? (
                <p className="py-12 text-center text-slate-500">No pending tasks.</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {tasks.map((t) => {
                    const key = `${t.visitId}::${t.at}`
                    return (
                      <li
                        key={key}
                        className={`rounded-2xl border p-4 shadow-lg shadow-black/20 ${
                          t.priority === 'CRITICAL'
                            ? 'border-rose-500/70 bg-rose-500/10 ring-1 ring-rose-500/40 shadow-rose-500/10'
                            : 'border-slate-700/80 bg-slate-900/80'
                        }`}
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-sm font-semibold text-cyan-300">
                            Bed {t.bedNumber ?? '?'} · {t.patientName}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              t.priority === 'CRITICAL'
                                ? 'bg-rose-500/25 text-rose-200'
                                : 'bg-slate-700/70 text-slate-300'
                            }`}
                          >
                            {t.priority === 'CRITICAL' ? 'CRITICAL' : 'NORMAL'}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-snug text-slate-200">{t.content || 'Nurse task'}</p>
                        <button
                          type="button"
                          disabled={busyTaskKey === key}
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 py-3.5 text-base font-bold text-emerald-200 ring-1 ring-emerald-500/50 active:scale-[0.99]"
                          onClick={async () => {
                            if (!t.taskId) {
                              setMsg('Task id missing. Refresh queue.')
                              setTimeout(() => setMsg(null), 3000)
                              return
                            }
                            setBusyTaskKey(key)
                            setTasks((prev) => prev.filter((x) => !(x.visitId === t.visitId && x.at === t.at)))
                            setFinished((prev) => [{ ...t, status: 'DONE', completedAt: new Date().toISOString() }, ...prev].slice(0, 20))
                            try {
                              const res = await fetch('/api/er/tasks/complete', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ taskId: t.taskId }),
                              })
                              if (res.ok) {
                                setMsg('Marked done.')
                                setTimeout(() => setMsg(null), 3000)
                                void fetchTasks()
                              } else {
                                void fetchTasks()
                              }
                            } catch {
                              void fetchTasks()
                            } finally {
                              setBusyTaskKey(null)
                            }
                          }}
                        >
                          <CheckCircle2 className="h-5 w-5" />
                          {busyTaskKey === key ? 'Processing...' : 'Mark as Completed'}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}
