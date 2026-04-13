'use client'

import { QRCodeSVG } from 'qrcode.react'
import ZionMedLogo from '@/components/ZionMedLogo'
import { Printer, X } from 'lucide-react'

interface BillingItem {
  category: 'Consultation' | 'Tests' | 'Medicines' | 'ER Procedures'
  description: string
  quantity: number
  unitPrice: number
  total: number
  addedAt?: string // Timestamp for ER procedures
}

interface ReceiptModalProps {
  patient: any
  totalAmount: number
  paymentMethod: 'Cash' | 'Card'
  billingItems?: BillingItem[]
  onClose: () => void
}

export default function ReceiptModal({
  patient,
  totalAmount,
  paymentMethod,
  billingItems = [],
  onClose,
}: ReceiptModalProps) {
  const receiptId = `ZM-${Date.now()}`
  const currentDate = new Date().toISOString()
  // QR Code contains: Patient Name + Total Amount + Date
  const qrCodeData = JSON.stringify({
    patientName: patient.patientName,
    totalAmount: totalAmount,
    date: currentDate,
    receiptId,
  })
  const formattedDate = new Date().toLocaleDateString('en-US', {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Receipt Card - Print Friendly */}
        <div className="glass rounded-xl border border-slate-800/50 overflow-hidden bg-[#0B1120]">
          {/* Print Button (Hidden when printing) */}
          <div className="p-6 border-b border-slate-800/50 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              <p className="text-sm font-semibold text-emerald-400">Payment Successful</p>
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
              <p className="text-xs text-slate-600 mt-1">Official Payment Receipt</p>
            </div>

            {/* Receipt Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-secondary mb-1">Receipt ID</p>
                <p className="font-semibold text-primary">{receiptId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-secondary mb-1">Date & Time</p>
                <p className="font-semibold text-primary">{formattedDate}</p>
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
                  <p className="text-xs text-secondary">Patient ID</p>
                  <p className="font-medium text-primary">{patient.patientId}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary">Visit ID</p>
                  <p className="font-medium text-primary">{patient.visitId}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary">Diagnosis</p>
                  <p className="font-medium text-primary line-clamp-1">{patient.diagnosis}</p>
                </div>
              </div>
            </div>

            {/* Billing Items - Grouped by Category */}
            {billingItems.length > 0 && (
              <div>
                <p className="text-xs text-secondary mb-3">Service Details</p>
                <div className="space-y-3">
                  {/* Consultation */}
                  {billingItems.filter(item => item.category === 'Consultation').map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-slate-800/30">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-primary">{item.description}</p>
                        <p className="text-xs text-secondary">
                          Qty: {item.quantity} × {item.unitPrice.toLocaleString('en-US')} IQD
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-primary">{item.total.toLocaleString('en-US')} IQD</p>
                    </div>
                  ))}

                  {/* ER Procedures with Timestamps */}
                  {billingItems.filter(item => item.category === 'ER Procedures').map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-slate-800/30">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-primary">
                          {item.description.replace('ER Procedure: ', '').replace('ER Consultation (Fast Track)', 'ER Consultation')}
                        </p>
                        {item.addedAt && (
                          <p className="text-xs text-rose-300">
                            Performed: {new Date(item.addedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        <p className="text-xs text-secondary">
                          Qty: {item.quantity} × {item.unitPrice.toLocaleString('en-US')} IQD
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-primary">{item.total.toLocaleString('en-US')} IQD</p>
                    </div>
                  ))}

                  {/* Tests */}
                  {billingItems.filter(item => item.category === 'Tests').map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-slate-800/30">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-primary">{item.description}</p>
                        <p className="text-xs text-secondary">
                          Qty: {item.quantity} × {item.unitPrice.toLocaleString('en-US')} IQD
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-primary">{item.total.toLocaleString('en-US')} IQD</p>
                    </div>
                  ))}

                  {/* Medicines */}
                  {billingItems.filter(item => item.category === 'Medicines').map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-slate-800/30">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-primary">{item.description}</p>
                        <p className="text-xs text-secondary">
                          Qty: {item.quantity} × {item.unitPrice.toLocaleString('en-US')} IQD
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-primary">{item.total.toLocaleString('en-US')} IQD</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Details */}
            <div className="space-y-2 border-t border-slate-800/50 pt-4">
              <p className="text-xs text-secondary mb-2">Payment Details</p>
              <div className="flex items-center justify-between py-2 border-b border-slate-800/30">
                <p className="text-sm text-secondary">Payment Method</p>
                <p className="text-sm font-semibold text-primary">{paymentMethod}</p>
              </div>
            </div>

            {/* Total */}
            <div className="border-t-2 border-blue-500/30 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-primary">Total Amount Paid</p>
                <p className="text-2xl font-bold text-blue-400">{totalAmount.toLocaleString('en-US')} IQD</p>
              </div>
            </div>

            {/* QR Code - Large for Verification */}
            <div className="border-t border-slate-800/50 pt-6">
              <div className="flex flex-col items-center">
                <p className="text-xs font-semibold text-secondary mb-4 uppercase tracking-wide">
                  Payment Verification QR Code
                </p>
                <div className="p-6 bg-white rounded-xl inline-block shadow-lg">
                  <QRCodeSVG
                    value={qrCodeData}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <p className="text-xs text-center text-secondary mt-4">
                  Scan QR code for payment verification
                </p>
              </div>
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

