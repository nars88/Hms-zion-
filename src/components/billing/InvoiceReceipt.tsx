'use client'

import { QRCodeSVG } from 'qrcode.react'
import ZionMedLogo from '@/components/ZionMedLogo'
import { Printer, X, CheckCircle } from 'lucide-react'

interface InvoiceReceiptProps {
  patient: any
  invoiceItems: Array<{
    description: string
    quantity: number
    unitPrice: number
    total: number
  }>
  totalAmount: number
  onClose: () => void
}

export default function InvoiceReceipt({
  patient,
  invoiceItems,
  totalAmount,
  onClose,
}: InvoiceReceiptProps) {
  const receiptId = `ZM-${Date.now()}`
  const qrCodeData = JSON.stringify({
    receiptId,
    patientId: patient.patientId,
    visitId: patient.visitId,
    totalAmount,
    date: new Date().toISOString(),
  })
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Receipt Card - Print Friendly */}
        <div className="glass rounded-xl border border-slate-800/50 overflow-hidden bg-[#0B1120]">
          {/* Print Button (Hidden when printing) */}
          <div className="p-6 border-b border-slate-800/50 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-400">Payment Confirmed</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/15 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Printer size={16} />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800/50 text-secondary border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <X size={16} />
                <span>Close</span>
              </button>
            </div>
          </div>

          {/* Receipt Content */}
          <div className="p-8 space-y-6">
            {/* Header with Logo */}
            <div className="text-center border-b border-slate-800/50 pb-6">
              <div className="flex justify-center mb-4">
                <ZionMedLogo size="lg" showText={true} />
              </div>
              <p className="text-xs text-secondary mt-2">Hospital Management System</p>
              <p className="text-xs text-slate-600 mt-1">Official Receipt</p>
            </div>

            {/* Receipt Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-secondary mb-1">Receipt ID</p>
                <p className="font-semibold text-primary">{receiptId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-secondary mb-1">Date & Time</p>
                <p className="font-semibold text-primary">{currentDate}</p>
              </div>
            </div>

            {/* Patient Info */}
            <div className="border-t border-b border-slate-800/50 py-4 space-y-2">
              <p className="text-xs text-secondary mb-2">Patient Information</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-secondary">Name</p>
                  <p className="font-medium text-primary">{patient.patientName}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary">Visit ID</p>
                  <p className="font-medium text-primary">{patient.visitId}</p>
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div>
              <p className="text-xs text-secondary mb-3">Bill Details</p>
              <div className="space-y-2">
                {invoiceItems.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-slate-800/30">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary">{item.description}</p>
                      <p className="text-xs text-secondary">Qty: {item.quantity} × ${item.unitPrice.toFixed(2)}</p>
                    </div>
                    <p className="text-sm font-semibold text-primary">${item.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="border-t-2 border-cyan-500/30 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-primary">Total Amount</p>
                <p className="text-2xl font-bold text-cyan-400">${totalAmount.toFixed(2)}</p>
              </div>
            </div>

            {/* QR Code */}
            <div className="border-t border-slate-800/50 pt-6">
              <div className="flex items-center justify-center">
                <div className="p-4 bg-white rounded-lg inline-block">
                  <QRCodeSVG
                    value={qrCodeData}
                    size={120}
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>
              <p className="text-xs text-center text-secondary mt-3">
                Scan QR code for payment verification
              </p>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-800/50 pt-6 text-center">
              <p className="text-xs text-slate-600">
                Thank you for choosing Zion Med
              </p>
              <p className="text-xs text-slate-600 mt-1">
                This is an official receipt. Please keep it for your records.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

