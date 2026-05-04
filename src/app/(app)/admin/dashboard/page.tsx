'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AdminDashboardSkeleton } from '@/components/shared/DataSkeleton'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { DollarSign, Users, CalendarCheck, TrendingUp, Download } from 'lucide-react'

type DashboardMonthPoint = {
  month: string
  year: number
  monthIndex: number
  revenue: number
  visits: number
}

type DashboardPayload = {
  success?: boolean
  error?: string
  summary?: {
    monthRevenueIqd: number
    monthVisitCount: number
    monthBillCount: number
    todayVisitCount: number
  }
  monthlySeries?: DashboardMonthPoint[]
}

type ChartTooltipProps = {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
  valueFormatter?: (v: number) => string
}

function ChartTooltip({ active, payload, label, valueFormatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null
  const formatter = valueFormatter ?? ((v: number) => String(v))
  const value = payload[0]?.value
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/90 backdrop-blur-md px-4 py-3 shadow-xl">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-white">{typeof value === 'number' ? formatter(value) : '—'}</p>
    </div>
  )
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [data, setData] = useState<DashboardPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    try {
      setFetchError(null)
      setLoading(true)
      const res = await fetch('/api/admin/dashboard', { credentials: 'include', cache: 'no-store' })
      const json = (await res.json().catch(() => ({}))) as DashboardPayload
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setData(json)
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : 'Failed to load dashboard')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    if (user?.role !== 'ADMIN') return
    const routes = [
      '/doctor/queue',
      '/accountant?view=all',
      '/reception',
      '/er-reception',
      '/pharmacy/dispense',
      '/lab',
      '/radiology',
    ]
    routes.forEach((href) => router.prefetch(href))
  }, [router, user?.role])

  const chartRows = useMemo(() => {
    const series = data?.monthlySeries ?? []
    return series.map((p) => ({
      month: p.month,
      revenue: p.revenue,
      visits: p.visits,
      key: `${p.year}-${p.monthIndex}`,
    }))
  }, [data?.monthlySeries])

  const summary = data?.summary

  const [backupLoading, setBackupLoading] = useState(false)
  const [backupError, setBackupError] = useState<string | null>(null)

  const handleExportBackup = useCallback(async () => {
    if (backupLoading) return
    try {
      setBackupLoading(true)
      setBackupError(null)
      const res = await fetch('/api/admin/backup', { cache: 'no-store' })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.error || `Backup failed (HTTP ${res.status})`)
      }
      const payload = await res.json()
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const now = new Date()
      const dd = String(now.getDate()).padStart(2, '0')
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const yyyy = now.getFullYear()
      const filename = `zion_backup_${dd}-${mm}-${yyyy}.json`
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setBackupError(e instanceof Error ? e.message : 'Failed to export backup')
    } finally {
      setBackupLoading(false)
    }
  }, [backupLoading])

  const stats = [
    {
      label: 'Total Revenue (Month)',
      value: `${(summary?.monthRevenueIqd ?? 0).toLocaleString('en-US')} IQD`,
      icon: DollarSign,
      color: 'emerald',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      iconCl: 'text-emerald-400',
    },
    {
      label: 'Patient visits (Month)',
      value: loading ? '…' : (summary?.monthVisitCount ?? 0),
      icon: Users,
      color: 'cyan',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      iconCl: 'text-cyan-400',
    },
    {
      label: "Today's visits (UTC day)",
      value: loading ? '…' : (summary?.todayVisitCount ?? 0),
      icon: CalendarCheck,
      color: 'amber',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      iconCl: 'text-amber-400',
    },
    {
      label: 'Bills created (Month)',
      value: loading ? '…' : (summary?.monthBillCount ?? 0),
      icon: TrendingUp,
      color: 'violet',
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      iconCl: 'text-violet-400',
    },
  ]

  return (
    <div className="min-h-full bg-slate-950 w-full">
      <div className="max-w-7xl mx-auto px-6 py-6 md:px-8 md:py-7 w-full">
        <div className="space-y-8">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => void loadDashboard()}
              disabled={loading}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-600 bg-slate-800/80 px-4 text-sm font-medium text-slate-200 hover:bg-slate-800 disabled:opacity-50"
            >
              {loading ? 'Refreshing…' : 'Refresh stats'}
            </button>
            <button
              type="button"
              onClick={handleExportBackup}
              disabled={backupLoading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-600 to-sky-600 px-5 text-sm font-semibold text-white shadow-lg shadow-cyan-900/30 transition hover:from-cyan-500 hover:to-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {backupLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Preparing backup...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export System Backup
                </>
              )}
            </button>
          </div>
          {fetchError ? (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
              {fetchError}
            </div>
          ) : null}
          {loading && !data ? (
            <AdminDashboardSkeleton />
          ) : null}
          {backupError ? (
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
              {backupError}
            </div>
          ) : null}
          <p className="text-xs text-slate-500">
            Stats and charts use live <span className="text-slate-400">visits</span> and <span className="text-slate-400">bills</span> from PostgreSQL (month boundaries UTC).
            Revenue counts bills with status Paid/COMPLETED in the month (by <code className="text-slate-600">paidAt</code>, or{' '}
            <code className="text-slate-600">updatedAt</code> if <code className="text-slate-600">paidAt</code> is null).
          </p>
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${loading && !data ? 'hidden' : ''}`}>
            {stats.map((s) => {
              const Icon = s.icon
              return (
                <div
                  key={s.label}
                  className={`rounded-xl border ${s.border} ${s.bg} p-5 transition-all hover:border-opacity-60`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-11 h-11 rounded-lg ${s.bg} border ${s.border} flex items-center justify-center`}>
                      <Icon size={22} className={s.iconCl} />
                    </div>
                    <span className="text-xs text-slate-400">{s.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {typeof s.value === 'number' ? s.value : s.value}
                  </p>
                </div>
              )
            })}
          </div>

          <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${loading && !data ? 'hidden' : ''}`}>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 min-h-0">
              <h2 className="text-lg font-semibold text-white mb-4">Monthly revenue (paid bills)</h2>
              <div className="h-[280px] w-full">
                {chartRows.length === 0 && !loading ? (
                  <p className="text-sm text-slate-500 py-12 text-center">No data for the last six months.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="#0d9488" stopOpacity={0.08} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={{ stroke: '#334155' }} />
                      <YAxis
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`}
                      />
                      <Tooltip
                        content={(p: unknown) => (
                          <ChartTooltip {...(p as ChartTooltipProps)} valueFormatter={(v) => `${Number(v).toLocaleString('en-US')} IQD`} />
                        )}
                        cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#06b6d4"
                        strokeWidth={2}
                        fill="url(#revenueGradient)"
                        activeDot={{ r: 8, stroke: '#06b6d4', strokeWidth: 2, fill: '#0f172a' }}
                        dot={{ r: 3, fill: '#06b6d4', strokeWidth: 0 }}
                        isAnimationActive
                        animationDuration={1500}
                        animationEasing="ease-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 min-h-0">
              <h2 className="text-lg font-semibold text-white mb-4">Patient visits by month</h2>
              <div className="h-[280px] w-full">
                {chartRows.length === 0 && !loading ? (
                  <p className="text-sm text-slate-500 py-12 text-center">No visit data for the last six months.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={{ stroke: '#334155' }} />
                      <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        content={(p: unknown) => <ChartTooltip {...(p as ChartTooltipProps)} />}
                        cursor={{ fill: '#1e293b', fillOpacity: 0.3, stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Bar
                        dataKey="visits"
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                        activeBar={{ fill: '#34d399', stroke: '#10b981', strokeWidth: 1 }}
                        isAnimationActive
                        animationDuration={1500}
                        animationEasing="ease-out"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
