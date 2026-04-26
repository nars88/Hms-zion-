'use client'

import { useMemo } from 'react'
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
import { DollarSign, Users, CalendarCheck, TrendingUp } from 'lucide-react'
import { useCentralizedBilling } from '@/contexts/CentralizedBillingContext'
import { useVisitData } from '@/contexts/VisitDataContext'
import { useAppointments } from '@/contexts/AppointmentsContext'

/** Mock data: last 6 months — realistic revenue (IQD) and patient visits */
const MOCK_MONTHLY_REVENUE_AND_VISITS = [
  { month: 'Oct', revenue: 12450000, visits: 342 },
  { month: 'Nov', revenue: 15820000, visits: 418 },
  { month: 'Dec', revenue: 14280000, visits: 391 },
  { month: 'Jan', revenue: 18940000, visits: 467 },
  { month: 'Feb', revenue: 16570000, visits: 429 },
  { month: 'Mar', revenue: 21230000, visits: 518 },
]

type ChartTooltipProps = {
  active?: boolean
  payload?: Array<{ value?: number }>
  label?: string
  valueFormatter?: (v: number) => string
}

/** Dark, elegant custom tooltip — exact values, ZION palette */
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
  const { invoices } = useCentralizedBilling()
  const { visitData } = useVisitData()
  const { getAppointmentsByDate } = useAppointments()

  const today = new Date().toISOString().slice(0, 10)
  const todayAppointments = getAppointmentsByDate(today).filter(
    (a) => a.status !== 'Cancelled' && a.status !== 'No_Show'
  )

  const monthlyData = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const monthlyInvoices = Object.values(invoices).filter((inv) => {
      const d = new Date(inv.createdAt)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
    const monthlyVisits = Object.values(visitData).filter((v) => {
      const d = new Date(v.completedAt)
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
    const totalRevenue = monthlyInvoices
      .filter((i) => i.status === 'Paid' || i.status === 'Partial')
      .reduce((s, i) => s + i.paidAmount, 0)
    return {
      totalRevenue,
      patientCount: monthlyVisits.length,
      invoiceCount: monthlyInvoices.length,
    }
  }, [invoices, visitData])

  const stats = [
    {
      label: 'Total Revenue (Month)',
      value: `${monthlyData.totalRevenue.toLocaleString('en-US')} IQD`,
      icon: DollarSign,
      color: 'emerald',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      iconCl: 'text-emerald-400',
    },
    {
      label: 'Patient Visits (Month)',
      value: monthlyData.patientCount,
      icon: Users,
      color: 'cyan',
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20',
      iconCl: 'text-cyan-400',
    },
    {
      label: "Today's Appointments",
      value: todayAppointments.length,
      icon: CalendarCheck,
      color: 'amber',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      iconCl: 'text-amber-400',
    },
    {
      label: 'Invoices (Month)',
      value: monthlyData.invoiceCount,
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 min-h-0">
              <h2 className="text-lg font-semibold text-white mb-4">Monthly Revenue</h2>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MOCK_MONTHLY_REVENUE_AND_VISITS} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#0d9488" stopOpacity={0.08} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={{ stroke: '#334155' }} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} />
                    <Tooltip
                      content={(p: unknown) => <ChartTooltip {...(p as ChartTooltipProps)} valueFormatter={(v) => `${Number(v).toLocaleString('en-US')} IQD`} />}
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
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 min-h-0">
              <h2 className="text-lg font-semibold text-white mb-4">Patient Visits</h2>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOCK_MONTHLY_REVENUE_AND_VISITS} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} axisLine={{ stroke: '#334155' }} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      content={(p: unknown) => <ChartTooltip {...(p as ChartTooltipProps)} />}
                      cursor={{ fill: '#1e293b', fillOpacity: 0.3, stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Bar dataKey="visits" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={48} activeBar={{ fill: '#34d399', stroke: '#10b981', strokeWidth: 1 }} isAnimationActive animationDuration={1500} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
