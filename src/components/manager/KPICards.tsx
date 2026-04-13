'use client'

/**
 * KPI CARDS - DATA SEPARATION RULE
 * 
 * Rule 1: Reads ONLY from Paid Invoices (Revenue Table)
 * - Does NOT read from Appointments Table
 * - Appointments = Planning (doesn't affect revenue)
 * - Invoices = Actual Revenue (this is what KPIs show)
 */

import { useMemo } from 'react'
import { DollarSign, Users, UserCheck, TrendingUp } from 'lucide-react'
import { useCentralizedBilling } from '@/contexts/CentralizedBillingContext' // Only Revenue/Invoices - NOT Appointments
import { useVisitData } from '@/contexts/VisitDataContext'
import { useAuth } from '@/contexts/AuthContext'

export default function KPICards() {
  const { invoices } = useCentralizedBilling()
  const { visitData } = useVisitData()
  const { user } = useAuth()

  const monthlyData = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Filter for current month
    const monthlyInvoices = Object.values(invoices).filter((invoice) => {
      const invoiceDate = new Date(invoice.createdAt)
      return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear
    })

    const monthlyVisits = Object.values(visitData).filter((visit) => {
      const visitDate = new Date(visit.completedAt)
      return visitDate.getMonth() === currentMonth && visitDate.getFullYear() === currentYear
    })

    // Calculate Total Revenue (Paid + Partial)
    const totalPaid = monthlyInvoices
      .filter((inv) => inv.status === 'Paid' || inv.status === 'Partial')
      .reduce((sum, inv) => sum + inv.paidAmount, 0)

    const totalPending = monthlyInvoices
      .filter((inv) => inv.status === 'Pending')
      .reduce((sum, inv) => sum + inv.remainingAmount, 0)

    // Calculate by payment method
    const cashPayments = monthlyInvoices
      .flatMap((inv) => inv.payments)
      .filter((pay) => pay.method === 'Cash')
      .reduce((sum, pay) => sum + pay.amount, 0)

    const cardPayments = monthlyInvoices
      .flatMap((inv) => inv.payments)
      .filter((pay) => pay.method === 'Card')
      .reduce((sum, pay) => sum + pay.amount, 0)

    const partialPayments = monthlyInvoices
      .filter((inv) => inv.status === 'Partial')
      .reduce((sum, inv) => sum + inv.paidAmount, 0)

    // Patient Traffic
    const patientCount = monthlyVisits.length

    // Top Performing Doctor (mock - in production, track by user ID)
    const topDoctor = 'Dr. Smith' // This would be calculated from visit data

    return {
      totalRevenue: totalPaid,
      totalPending,
      cashPayments,
      cardPayments,
      partialPayments,
      patientCount,
      topDoctor,
    }
  }, [invoices, visitData])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Revenue */}
      <div className="glass rounded-xl border border-slate-800/50 p-6 hover:border-emerald-500/30 transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <DollarSign size={24} className="text-emerald-400" />
          </div>
          <span className="text-xs text-secondary">Total Revenue</span>
        </div>
        <p className="text-3xl font-bold text-emerald-400 mb-1">
          {monthlyData.totalRevenue.toLocaleString('en-US')} IQD
        </p>
        <p className="text-xs text-secondary">
          {monthlyData.totalPending > 0 && (
            <span className="text-amber-400">+ {monthlyData.totalPending.toLocaleString('en-US')} IQD pending</span>
          )}
        </p>
      </div>

      {/* Patient Traffic */}
      <div className="glass rounded-xl border border-slate-800/50 p-6 hover:border-cyan-500/30 transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <Users size={24} className="text-cyan-400" />
          </div>
          <span className="text-xs text-secondary">Patient Traffic</span>
        </div>
        <p className="text-3xl font-bold text-cyan-400 mb-1">{monthlyData.patientCount}</p>
        <p className="text-xs text-secondary">Completed visits this month</p>
      </div>

      {/* Top Performing Doctor */}
      <div className="glass rounded-xl border border-slate-800/50 p-6 hover:border-amber-500/30 transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
            <UserCheck size={24} className="text-amber-400" />
          </div>
          <span className="text-xs text-secondary">Top Doctor</span>
        </div>
        <p className="text-2xl font-bold text-amber-400 mb-1">{monthlyData.topDoctor}</p>
        <p className="text-xs text-secondary">Most active this month</p>
      </div>

      {/* Payment Methods Breakdown */}
      <div className="glass rounded-xl border border-slate-800/50 p-6 hover:border-purple-500/30 transition-all">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
            <TrendingUp size={24} className="text-purple-400" />
          </div>
          <span className="text-xs text-secondary">Payment Methods</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-secondary">Cash</span>
            <span className="text-sm font-semibold text-primary">
              {monthlyData.cashPayments.toLocaleString('en-US')} IQD
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-secondary">Card</span>
            <span className="text-sm font-semibold text-primary">
              {monthlyData.cardPayments.toLocaleString('en-US')} IQD
            </span>
          </div>
          {monthlyData.partialPayments > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-secondary">Partial</span>
              <span className="text-sm font-semibold text-amber-400">
                {monthlyData.partialPayments.toLocaleString('en-US')} IQD
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

