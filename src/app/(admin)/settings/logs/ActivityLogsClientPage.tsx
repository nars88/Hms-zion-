'use client'

import { useEffect, useState } from 'react'

type AuditRow = {
  id: string
  userId: string | null
  userName: string
  userRole: string
  action: string
  metadata: unknown
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(d)
  } catch {
    return iso
  }
}

function shortenUa(ua: string | null, max = 72): string {
  if (!ua) return '—'
  return ua.length <= max ? ua : `${ua.slice(0, max - 1)}…`
}

export default function ActivityLogsClientPage() {
  const [logs, setLogs] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userFilter, setUserFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  const fetchLogs = async (user: string, date: string) => {
    try {
      setLoading(true)
      setError(null)
      const q = new URLSearchParams()
      if (user.trim()) q.set('user', user.trim())
      if (date.trim()) q.set('date', date.trim())
      const qs = q.toString()
      const res = await fetch(`/api/admin/audit-logs${qs ? `?${qs}` : ''}`, { cache: 'no-store' })
      const data = (await res.json().catch(() => ({}))) as { error?: string; logs?: AuditRow[] }
      if (!res.ok) throw new Error(data.error || 'Failed to load activity logs')
      setLogs(Array.isArray(data.logs) ? data.logs : [])
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Failed to load activity logs')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchLogs('', '')
  }, [])

  return (
    <div className="w-full overflow-auto p-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Activity logs</h1>
          <p className="mt-1 text-sm text-slate-400">
            Read-only history of critical admin actions (pricing, employees, backups, branding).
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-800/70 bg-slate-900/40 p-4">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-400">Filter by user name</label>
            <input
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none"
            />
          </div>
          <div className="w-full min-w-[160px] sm:w-44">
            <label className="mb-1 block text-xs font-medium text-slate-400">Filter by date (UTC day)</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 focus:border-cyan-500/50 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => void fetchLogs(userFilter, dateFilter)}
            disabled={loading}
            className="h-10 shrink-0 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-4 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-50"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => {
              setUserFilter('')
              setDateFilter('')
              void fetchLogs('', '')
            }}
            disabled={loading}
            className="h-10 shrink-0 rounded-lg border border-slate-600 px-4 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            Clear
          </button>
        </div>

        {error ? (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-slate-800/70 bg-slate-900/40">
          <table className="w-full min-w-[960px]">
            <thead className="bg-slate-900/80">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Time
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  User
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Action
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  IP
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Device
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                    Loading…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    No activity found.
                  </td>
                </tr>
              ) : (
                logs.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-800/30">
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-300">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-200">
                      <div className="font-medium">{row.userName}</div>
                      <div className="text-xs text-slate-500">{row.userRole}</div>
                    </td>
                    <td className="max-w-md px-3 py-3 text-sm text-slate-200">{row.action}</td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-400">
                      {row.ipAddress || '—'}
                    </td>
                    <td className="max-w-xs px-3 py-3 text-xs text-slate-500" title={row.userAgent || undefined}>
                      {shortenUa(row.userAgent)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
