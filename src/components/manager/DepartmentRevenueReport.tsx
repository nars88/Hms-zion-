'use client'

/**
 * DEPARTMENT REVENUE REPORT - DATA SEPARATION RULE
 * 
 * Rule 1: Reads ONLY from Paid Invoices (Revenue Table)
 * - Does NOT read from Appointments Table
 * - Appointments = Planning (doesn't affect revenue)
 * - Invoices = Actual Revenue (this is what department reports show)
 */

import { useMemo } from 'react'
import { FlaskConical, Stethoscope, Scan, Pill, TrendingUp } from 'lucide-react'
import { useCentralizedBilling } from '@/contexts/CentralizedBillingContext' // Only Revenue/Invoices - NOT Appointments

export default function DepartmentRevenueReport() {
  const { invoices } = useCentralizedBilling()

  const departmentRevenue = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Filter for current month
    const monthlyInvoices = Object.values(invoices).filter((invoice) => {
      const invoiceDate = new Date(invoice.createdAt)
      return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear
    })

    // Calculate revenue by department
    const departmentTotals: Record<string, number> = {
      Doctor: 0,
      Laboratory: 0,
      Radiology: 0,
      Pharmacy: 0,
    }

    monthlyInvoices.forEach((invoice) => {
      invoice.items.forEach((item) => {
        if (departmentTotals.hasOwnProperty(item.department)) {
          departmentTotals[item.department] += item.total
        }
      })
    })

    // Calculate total
    const total = Object.values(departmentTotals).reduce((sum, val) => sum + val, 0)

    return {
      departments: departmentTotals,
      total,
    }
  }, [invoices])

  const getDepartmentIcon = (department: string) => {
    switch (department) {
      case 'Doctor':
        return <Stethoscope size={20} className="text-cyan-400" />
      case 'Laboratory':
        return <FlaskConical size={20} className="text-amber-400" />
      case 'Radiology':
        return <Scan size={20} className="text-purple-400" />
      case 'Pharmacy':
        return <Pill size={20} className="text-rose-400" />
      default:
        return <TrendingUp size={20} className="text-slate-400" />
    }
  }

  const getDepartmentColor = (department: string) => {
    switch (department) {
      case 'Doctor':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
      case 'Laboratory':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      case 'Radiology':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/20'
      case 'Pharmacy':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20'
    }
  }

  return (
    <div className="glass rounded-xl border border-slate-800/50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center border border-teal-500/20">
          <TrendingUp size={20} className="text-teal-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-primary">Department Revenue</h3>
          <p className="text-xs text-secondary mt-0.5">Revenue breakdown by department</p>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(departmentRevenue.departments).map(([department, revenue]) => {
          const percentage = departmentRevenue.total > 0 ? (revenue / departmentRevenue.total) * 100 : 0
          return (
            <div key={department} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${getDepartmentColor(department)}`}>
                    {getDepartmentIcon(department)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">{department}</p>
                    <p className="text-xs text-secondary">{percentage.toFixed(1)}% of total</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-primary">{revenue.toLocaleString('en-US')} IQD</p>
              </div>
              <div className="w-full h-2 bg-slate-900/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500/50 to-teal-500 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}

        {/* Total */}
        <div className="pt-4 border-t border-slate-800/50 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-primary">Total Revenue</p>
            <p className="text-xl font-bold text-emerald-400">
              {departmentRevenue.total.toLocaleString('en-US')} IQD
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

