'use client'

import { useState } from 'react'
import { FileText, Download, Loader2 } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { useCentralizedBilling } from '@/contexts/CentralizedBillingContext'
import { useVisitData } from '@/contexts/VisitDataContext'
import { useWaitingList } from '@/contexts/WaitingListContext'

interface MonthlyReportGeneratorProps {
  onReportGenerated?: () => void
}

interface ReportMetrics {
  totalRevenue: number
  totalPending: number
  patientCount: number
  totalInvoices: number
  paidInvoices: number
  partialInvoices: number
  pendingInvoices: number
}

interface ReportData {
  month: string
  generatedAt: string
  metrics: ReportMetrics
  invoices: Array<Record<string, unknown>>
  visits: Array<Record<string, unknown>>
}

const formatIQD = (value: number) => `${value.toLocaleString('en-US')} IQD`

const safeDate = (value: unknown) => {
  if (!value) return '-'
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-US')
}

const getReportFileName = (extension: 'pdf' | 'xlsx') => {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  return `zion_monthly_report_${day}-${month}-${year}.${extension}`
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

    const parsed = JSON.parse(reportData) as ReportData
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text('ZION MED - Monthly Report', 14, 18)
    doc.setFontSize(11)
    doc.text(`Month: ${parsed.month}`, 14, 26)
    doc.text(`Generated: ${new Date(parsed.generatedAt).toLocaleString('en-US')}`, 14, 32)

    autoTable(doc, {
      startY: 40,
      head: [['Metric', 'Value']],
      body: [
        ['Total Revenue', formatIQD(parsed.metrics.totalRevenue)],
        ['Total Pending', formatIQD(parsed.metrics.totalPending)],
        ['Patient Visits', String(parsed.metrics.patientCount)],
        ['Total Invoices', String(parsed.metrics.totalInvoices)],
        ['Paid Invoices', String(parsed.metrics.paidInvoices)],
        ['Partial Invoices', String(parsed.metrics.partialInvoices)],
        ['Pending Invoices', String(parsed.metrics.pendingInvoices)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [8, 145, 178] },
    })

    const invoiceRows = parsed.invoices.map((invoice) => ({
      id: String(invoice.id ?? invoice.invoiceNumber ?? '-'),
      patient: String(invoice.patientName ?? invoice.patientId ?? '-'),
      status: String(invoice.status ?? '-'),
      paid: Number(invoice.paidAmount ?? 0),
      remaining: Number(invoice.remainingAmount ?? 0),
      createdAt: safeDate(invoice.createdAt),
    }))

    autoTable(doc, {
      startY: (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
        ? ((doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable!.finalY as number) + 10
        : 90,
      head: [['Invoice', 'Patient', 'Status', 'Paid', 'Remaining', 'Created']],
      body: invoiceRows.length
        ? invoiceRows.map((row) => [
            row.id,
            row.patient,
            row.status,
            formatIQD(row.paid),
            formatIQD(row.remaining),
            row.createdAt,
          ])
        : [['-', '-', 'No invoices this month', '-', '-', '-']],
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 9 },
    })

    doc.save(getReportFileName('pdf'))
  }

  const exportToExcel = () => {
    const reportData = sessionStorage.getItem('monthly_report_data')
    if (!reportData) {
      alert('Please generate the report first!')
      return
    }

    const parsed = JSON.parse(reportData) as ReportData

    const metricsSheet = XLSX.utils.json_to_sheet([
      { Metric: 'Month', Value: parsed.month },
      { Metric: 'Generated At', Value: new Date(parsed.generatedAt).toLocaleString('en-US') },
      { Metric: 'Total Revenue', Value: parsed.metrics.totalRevenue },
      { Metric: 'Total Pending', Value: parsed.metrics.totalPending },
      { Metric: 'Patient Visits', Value: parsed.metrics.patientCount },
      { Metric: 'Total Invoices', Value: parsed.metrics.totalInvoices },
      { Metric: 'Paid Invoices', Value: parsed.metrics.paidInvoices },
      { Metric: 'Partial Invoices', Value: parsed.metrics.partialInvoices },
      { Metric: 'Pending Invoices', Value: parsed.metrics.pendingInvoices },
    ])

    const invoicesSheet = XLSX.utils.json_to_sheet(
      parsed.invoices.map((invoice) => ({
        InvoiceID: String(invoice.id ?? invoice.invoiceNumber ?? '-'),
        Patient: String(invoice.patientName ?? invoice.patientId ?? '-'),
        Status: String(invoice.status ?? '-'),
        PaidAmount: Number(invoice.paidAmount ?? 0),
        RemainingAmount: Number(invoice.remainingAmount ?? 0),
        CreatedAt: safeDate(invoice.createdAt),
      }))
    )

    const visitsSheet = XLSX.utils.json_to_sheet(
      parsed.visits.map((visit) => ({
        VisitID: String(visit.id ?? '-'),
        PatientID: String(visit.patientId ?? '-'),
        CompletedAt: safeDate(visit.completedAt),
        Status: String(visit.status ?? '-'),
      }))
    )

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, metricsSheet, 'Summary')
    XLSX.utils.book_append_sheet(wb, invoicesSheet, 'Invoices')
    XLSX.utils.book_append_sheet(wb, visitsSheet, 'Visits')
    XLSX.writeFile(wb, getReportFileName('xlsx'))
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

