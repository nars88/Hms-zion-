'use client'

import { useMemo, useState } from 'react'
import { Filter, Search } from 'lucide-react'
import { useCentralizedBilling } from '@/contexts/CentralizedBillingContext'
import type { Invoice, InvoiceStatus } from '@/contexts/CentralizedBillingContext'
import DepartmentRevenueReport from '@/components/manager/DepartmentRevenueReport'
import InvoiceStatusAnalytics from '@/components/manager/InvoiceStatusAnalytics'
import MonthlyReportGenerator from '@/components/manager/MonthlyReportGenerator'

export default function AdminReportsPage() {
  const { invoices } = useCentralizedBilling()
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'All'>('All')
  const [departmentFilter, setDepartmentFilter] = useState<string>('All')
  const [searchQuery, setSearchQuery] = useState('')

  const invoiceList = useMemo(() => Object.values(invoices), [invoices])

  const filteredInvoices = useMemo(() => {
    return invoiceList.filter((inv) => {
      if (statusFilter !== 'All' && inv.status !== statusFilter) return false
      if (departmentFilter !== 'All') {
        const hasDept = inv.items.some((i) => i.department === departmentFilter)
        if (!hasDept) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        if (
          !inv.patientName?.toLowerCase().includes(q) &&
          !inv.patientId?.toLowerCase().includes(q) &&
          !inv.visitId?.toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [invoiceList, statusFilter, departmentFilter, searchQuery])

  const departments = useMemo(() => {
    const set = new Set<string>()
    invoiceList.forEach((inv) => inv.items.forEach((i) => set.add(i.department)))
    return Array.from(set).sort()
  }, [invoiceList])

  return (
    <div className="min-h-full bg-slate-950 w-full">
      <div className="max-w-7xl mx-auto px-6 py-6 md:px-8 md:py-7 w-full">
        <div className="space-y-8">
          <MonthlyReportGenerator onReportGenerated={() => {}} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DepartmentRevenueReport />
            <InvoiceStatusAnalytics />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by patient name, ID, visit..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'All')}
                  className="rounded-lg bg-slate-800/80 border border-slate-700 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                >
                  <option value="All">All statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial</option>
                  <option value="Paid">Paid</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="rounded-lg bg-slate-800/80 border border-slate-700 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                >
                  <option value="All">All departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Patient</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Visit ID</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-sm">
                        No invoices match the filters.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-slate-800/80 hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-sm text-white">{inv.patientName}</td>
                        <td className="px-4 py-3 text-sm text-slate-300 font-mono">{inv.visitId?.slice(0, 12)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                              inv.status === 'Paid'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : inv.status === 'Partial'
                                ? 'bg-amber-500/20 text-amber-400'
                                : inv.status === 'Pending'
                                ? 'bg-cyan-500/20 text-cyan-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-300">{inv.total.toLocaleString('en-US')} IQD</td>
                        <td className="px-4 py-3 text-sm text-slate-400">
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-slate-800 text-xs text-slate-500">
              Showing {filteredInvoices.length} of {invoiceList.length} invoices
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
