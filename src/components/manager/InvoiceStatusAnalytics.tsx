'use client'

/**
 * INVOICE STATUS ANALYTICS - DATA SEPARATION RULE
 * 
 * Rule 1: Reads ONLY from Paid Invoices (Revenue Table)
 * - Does NOT read from Appointments Table
 * - Appointments = Planning (doesn't affect revenue)
 * - Invoices = Actual Revenue (this is what status analytics show)
 */

import { useMemo } from 'react'
import { FileCheck, Clock, XCircle, DollarSign } from 'lucide-react'
import { useCentralizedBilling } from '@/contexts/CentralizedBillingContext' // Only Revenue/Invoices - NOT Appointments

export default function InvoiceStatusAnalytics() {
  const { invoices } = useCentralizedBilling()

  const statusAnalytics = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Filter for current month
    const monthlyInvoices = Object.values(invoices).filter((invoice) => {
      const invoiceDate = new Date(invoice.createdAt)
      return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear
    })

    const paid = monthlyInvoices.filter((inv) => inv.status === 'Paid')
    const partial = monthlyInvoices.filter((inv) => inv.status === 'Partial')
    const pending = monthlyInvoices.filter((inv) => inv.status === 'Pending')
    const cancelled = monthlyInvoices.filter((inv) => inv.status === 'Cancelled')

    const total = monthlyInvoices.length

    return {
      paid: {
        count: paid.length,
        percentage: total > 0 ? (paid.length / total) * 100 : 0,
        amount: paid.reduce((sum, inv) => sum + inv.total, 0),
      },
      partial: {
        count: partial.length,
        percentage: total > 0 ? (partial.length / total) * 100 : 0,
        amount: partial.reduce((sum, inv) => sum + inv.paidAmount, 0),
      },
      pending: {
        count: pending.length,
        percentage: total > 0 ? (pending.length / total) * 100 : 0,
        amount: pending.reduce((sum, inv) => sum + inv.total, 0),
      },
      cancelled: {
        count: cancelled.length,
        percentage: total > 0 ? (cancelled.length / total) * 100 : 0,
        amount: cancelled.reduce((sum, inv) => sum + inv.total, 0),
      },
      total,
    }
  }, [invoices])

  const statusConfig = [
    {
      label: 'Paid',
      data: statusAnalytics.paid,
      icon: FileCheck,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      barColor: 'from-emerald-500/50 to-emerald-500',
    },
    {
      label: 'Partial',
      data: statusAnalytics.partial,
      icon: DollarSign,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      barColor: 'from-amber-500/50 to-amber-500',
    },
    {
      label: 'Pending',
      data: statusAnalytics.pending,
      icon: Clock,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      barColor: 'from-cyan-500/50 to-cyan-500',
    },
    {
      label: 'Cancelled',
      data: statusAnalytics.cancelled,
      icon: XCircle,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      barColor: 'from-rose-500/50 to-rose-500',
    },
  ]

  return (
    <div className="glass rounded-xl border border-slate-800/50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
          <FileCheck size={20} className="text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-primary">Invoice Status Analytics</h3>
          <p className="text-xs text-secondary mt-0.5">Payment status breakdown</p>
        </div>
      </div>

      <div className="space-y-4">
        {statusConfig.map((status) => {
          const Icon = status.icon
          return (
            <div key={status.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${status.color}`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">{status.label}</p>
                    <p className="text-xs text-secondary">
                      {status.data.count} invoices ({status.data.percentage.toFixed(1)}%)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">{status.data.amount.toLocaleString('en-US')} IQD</p>
                  <p className="text-xs text-secondary">{status.data.count} invoices</p>
                </div>
              </div>
              <div className="w-full h-2 bg-slate-900/50 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${status.barColor} transition-all duration-500`}
                  style={{ width: `${status.data.percentage}%` }}
                />
              </div>
            </div>
          )
        })}

        {/* Summary */}
        <div className="pt-4 border-t border-slate-800/50 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-primary">Total Invoices</p>
            <p className="text-lg font-bold text-cyan-400">{statusAnalytics.total}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

