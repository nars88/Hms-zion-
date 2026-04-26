'use client'

import { CheckCircle, Lock, Printer, Receipt, Unlock, X } from 'lucide-react'
import { Invoice, InvoiceItem } from '@/types/billing'

export interface MedicalReceiptProps {
  invoice: Invoice
  onClose: () => void
  onPrint?: () => void
  showPaymentActions?: boolean  // shows Confirm Payment + Discharge in accountant
  isArchiveView?: boolean        // shows Archive badge, hides action buttons
  onConfirmPayment?: () => void
  onDischarge?: () => void
  isDischarging?: boolean
  isConfirmingPayment?: boolean
  allowConfirmPayment?: boolean
  className?: string
}

export default function MedicalReceipt({
  invoice,
  onClose,
  onPrint,
  showPaymentActions = false,
  isArchiveView = false,
  onConfirmPayment,
  onDischarge,
  isDischarging = false,
  isConfirmingPayment = false,
  allowConfirmPayment = true,
  className = '',
}: MedicalReceiptProps) {
  const isPaid = invoice.paymentStatus === 'Paid' || invoice.paymentStatus === 'COMPLETED'
  const showPaidSection = isPaid || !allowConfirmPayment

  return (
    <div className={`max-h-[85vh] flex flex-col rounded-xl border-2 border-slate-600/60 bg-slate-800/80 shadow-xl overflow-hidden min-h-0 ${className}`.trim()}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-5 py-1.5 border-b border-slate-600/50 bg-slate-900/60 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Receipt className="h-6 w-6 text-cyan-400" />
          <span className="text-lg font-bold text-slate-100">Premium Medical Receipt</span>
          {isArchiveView ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-semibold bg-emerald-500/20 text-emerald-400">Archive</span>
          ) : (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-semibold ${invoice.qrStatus === 'CLEARED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
              {invoice.qrStatus === 'CLEARED' ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              QR {invoice.qrStatus}
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-white" title="Close"><X size={22} /></button>
      </div>

      {/* Patient Header (top row) — flex-shrink-0 */}
      <div className="flex items-center gap-6 px-6 py-3 border-b border-slate-600/50 bg-slate-800/50 flex-shrink-0">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-0.5">Invoice ID</p>
          <p className="text-xl font-bold text-cyan-400 font-mono">#{invoice.id.slice(-8)}</p>
        </div>
        <div className="h-8 w-px bg-slate-600/80 flex-shrink-0" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-0.5">Patient Name</p>
          <p className="text-xl font-bold text-slate-100 truncate">{invoice.patient.firstName} {invoice.patient.lastName}</p>
        </div>
        <div className="h-8 w-px bg-slate-600/80 flex-shrink-0" aria-hidden />
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium mb-0.5">Phone</p>
          <p className="text-xl font-bold text-slate-200">{invoice.patient.phone}</p>
        </div>
      </div>

      {/* Service Items heading */}
      <div className="px-5 pt-4 flex-shrink-0">
        <h3 className="text-sm text-slate-500 font-semibold uppercase tracking-wide">Service Items</h3>
      </div>

      {/* Table wrapper — ONLY this scrolls: flex-1 overflow-y-auto min-h-0 + maxHeight 350px */}
      <div className="flex-1 overflow-y-auto min-h-0 py-4 px-5 invoice-table-scroll" style={{ maxHeight: '350px' }}>
        <div className="border border-slate-600/40 rounded-lg overflow-hidden">
          <table className="w-full text-base border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-800/98 backdrop-blur-sm border-b-2 border-slate-600/50 shadow-sm">
              <tr>
                <th className="text-left py-3 px-4 text-slate-400 font-semibold bg-slate-800/98">Service</th>
                <th className="text-right py-3 px-4 text-slate-400 font-semibold w-20 bg-slate-800/98">Qty</th>
                <th className="text-right py-3 px-4 text-slate-400 font-semibold bg-slate-800/98">Unit Price</th>
                <th className="text-right py-3 px-4 text-slate-400 font-semibold bg-slate-800/98">Total</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.items as InvoiceItem[]).map((item, idx) => (
                <tr key={idx} className="border-b border-slate-700/50">
                  <td className="py-3 px-4"><p className="font-semibold text-slate-200">{item.description}</p><p className="text-sm text-slate-500 mt-0.5">{item.department}</p></td>
                  <td className="py-3 px-4 text-right text-slate-300 tabular-nums">{item.quantity}</td>
                  <td className="py-3 px-4 text-right text-slate-300 tabular-nums">{Number(item.unitPrice).toLocaleString()} IQD</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-200 tabular-nums">{Number(item.total).toLocaleString()} IQD</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grand Total & Buttons — flex-shrink-0 pt-4 border-t (fixed at bottom) */}
      <div className="flex-shrink-0 pt-4 border-t border-slate-600/50 px-5 pb-4">
        <div className={`flex justify-between items-center py-5 px-6 rounded-xl bg-amber-500/15 border-2 border-amber-400/50 ${isArchiveView ? '' : 'mb-4'}`.trim()}>
          <span className="text-2xl font-black text-amber-400 uppercase tracking-wide">Grand Total</span>
          <span className="text-4xl font-black text-amber-400 tabular-nums">{Number(invoice.total).toLocaleString()} IQD</span>
        </div>
      </div>

      {!isArchiveView && (
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/60 border-t border-slate-600/50 flex-shrink-0">
          <div>
            <p className="text-xs text-slate-500 uppercase font-medium">Payment Status</p>
            <p className={`text-lg font-bold ${isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>{invoice.paymentStatus}</p>
            {invoice.paidAt && <p className="text-sm text-slate-500">{new Date(invoice.paidAt).toLocaleString()}</p>}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onPrint}
              className="px-6 py-3 text-base font-bold bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 flex items-center gap-2"
            >
              <Printer size={20} />
              {isPaid ? 'Print Receipt' : 'Print Invoice'}
            </button>
            {showPaymentActions && !isPaid && allowConfirmPayment && (
              <button
                onClick={onConfirmPayment}
                disabled={isConfirmingPayment}
                className="px-6 py-3 text-base font-bold bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle size={20} />
                {isConfirmingPayment ? 'Processing...' : 'Confirm Payment'}
              </button>
            )}
            {showPaymentActions && showPaidSection && (
              <>
                <span className="px-5 py-3 bg-emerald-500/15 border-2 border-emerald-500/40 rounded-xl text-base font-bold text-emerald-400 flex items-center gap-2"><CheckCircle size={20} />Paid</span>
                <button onClick={onDischarge} disabled={isDischarging} className="px-6 py-3 text-base font-bold bg-slate-600 hover:bg-slate-500 text-white rounded-xl disabled:opacity-50">{isDischarging ? 'Discharging...' : 'Discharge'}</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

