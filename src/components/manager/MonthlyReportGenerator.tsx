'use client'

import { useState } from 'react'
import { FileText, Download, Loader2 } from 'lucide-react'
import { useCentralizedBilling } from '@/contexts/CentralizedBillingContext'
import { useVisitData } from '@/contexts/VisitDataContext'
import { useWaitingList } from '@/contexts/WaitingListContext'

interface MonthlyReportGeneratorProps {
  onReportGenerated?: () => void
}

/**
 * MONTHLY REPORT GENERATOR - DATA SEPARATION RULE
 * 
 * Rule 1: This component reads ONLY from Paid Invoices (Revenue Table)
 * - Does NOT read from Appointments Table
 * - Appointments = Planning (doesn't affect money)
 * - Invoices = Actual Revenue (this is what reports read)
 */
export default function MonthlyReportGenerator({ onReportGenerated }: MonthlyReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const { invoices } = useCentralizedBilling() // Only reads from Revenue/Invoices - NOT Appointments
  const { visitData } = useVisitData()
  const { waitingPatients } = useWaitingList()

  const generateMonthlyReport = async () => {
    setIsGenerating(true)

    // Simulate report generation delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Get current month data
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Filter invoices for current month
    // Rule 1: Only reads from Paid Invoices (Revenue Table) - NOT from Appointments
    const monthlyInvoices = Object.values(invoices).filter((invoice) => {
      const invoiceDate = new Date(invoice.createdAt)
      return invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear
    })

    // Filter visits for current month
    const monthlyVisits = Object.values(visitData).filter((visit) => {
      const visitDate = new Date(visit.completedAt)
      return visitDate.getMonth() === currentMonth && visitDate.getFullYear() === currentYear
    })

    // Calculate metrics
    const totalRevenue = monthlyInvoices
      .filter((inv) => inv.status === 'Paid' || inv.status === 'Partial')
      .reduce((sum, inv) => sum + inv.paidAmount, 0)

    const totalPending = monthlyInvoices
      .filter((inv) => inv.status === 'Pending')
      .reduce((sum, inv) => sum + inv.remainingAmount, 0)

    const patientCount = monthlyVisits.length

    // Prepare report data
    const reportData = {
      month: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
      generatedAt: new Date().toISOString(),
      metrics: {
        totalRevenue,
        totalPending,
        patientCount,
        totalInvoices: monthlyInvoices.length,
        paidInvoices: monthlyInvoices.filter((inv) => inv.status === 'Paid').length,
        partialInvoices: monthlyInvoices.filter((inv) => inv.status === 'Partial').length,
        pendingInvoices: monthlyInvoices.filter((inv) => inv.status === 'Pending').length,
      },
      invoices: monthlyInvoices,
      visits: monthlyVisits,
    }

    // Store report data for export
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('monthly_report_data', JSON.stringify(reportData))
    }

    setIsGenerating(false)
    onReportGenerated?.()

    alert(`Monthly Report Generated Successfully!\n\nTotal Revenue: ${totalRevenue.toLocaleString('en-US')} IQD\nPatient Visits: ${patientCount}\nInvoices: ${monthlyInvoices.length}`)
  }

  const exportToPDF = () => {
    const reportData = sessionStorage.getItem('monthly_report_data')
    if (!reportData) {
      alert('Please generate the report first!')
      return
    }

    // In production, use a library like jsPDF or html2pdf
    alert('PDF Export functionality will be implemented with jsPDF library')
  }

  const exportToExcel = () => {
    const reportData = sessionStorage.getItem('monthly_report_data')
    if (!reportData) {
      alert('Please generate the report first!')
      return
    }

    // In production, use a library like xlsx
    alert('Excel Export functionality will be implemented with xlsx library')
  }

  return (
    <div className="glass rounded-xl border border-slate-800/50 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <FileText size={24} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-primary">Monthly Report Generator</h2>
            <p className="text-xs text-secondary mt-0.5">Generate comprehensive monthly analytics report</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={generateMonthlyReport}
            disabled={isGenerating}
            className="px-6 py-3 bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-lg font-semibold hover:bg-cyan-500/30 hover:border-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <FileText size={18} />
                <span>Generate Monthly Report</span>
              </>
            )}
          </button>
          <div className="flex items-center gap-2 border-l border-slate-800/50 pl-3">
            <button
              onClick={exportToPDF}
              className="px-4 py-2 bg-slate-800/50 text-secondary border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-all text-sm font-medium flex items-center gap-2"
            >
              <Download size={16} />
              <span>PDF</span>
            </button>
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-slate-800/50 text-secondary border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-all text-sm font-medium flex items-center gap-2"
            >
              <Download size={16} />
              <span>Excel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

