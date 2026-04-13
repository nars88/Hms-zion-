'use client'

import { useState, useEffect } from 'react'
import InvoiceReceipt from './InvoiceReceipt'
import { Calculator, FileText, CheckCircle } from 'lucide-react'

interface InvoiceGeneratorProps {
  patient: any
  onPaymentComplete: () => void
}

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export default function InvoiceGenerator({ patient, onPaymentComplete }: InvoiceGeneratorProps) {
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([])
  const [consultationFee] = useState(50) // Standard consultation fee
  const [labFees, setLabFees] = useState(0)
  const [pharmacyTotal, setPharmacyTotal] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [showReceipt, setShowReceipt] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Calculate invoice when patient is selected
  useEffect(() => {
    if (patient) {
      // Mock lab fees (from diagnostics)
      const mockLabFees = Math.floor(Math.random() * 200) + 50 // $50-$250
      setLabFees(mockLabFees)

      // Mock pharmacy total (from prescribed medications)
      const mockPharmacyTotal = Math.floor(Math.random() * 150) + 30 // $30-$180
      setPharmacyTotal(mockPharmacyTotal)

      // Build invoice items
      const items: InvoiceItem[] = [
        {
          description: 'Consultation Fee',
          quantity: 1,
          unitPrice: consultationFee,
          total: consultationFee,
        },
      ]

      if (mockLabFees > 0) {
        items.push({
          description: 'Lab/X-Ray Fees',
          quantity: 1,
          unitPrice: mockLabFees,
          total: mockLabFees,
        })
      }

      if (mockPharmacyTotal > 0) {
        items.push({
          description: 'Pharmacy Total',
          quantity: 1,
          unitPrice: mockPharmacyTotal,
          total: mockPharmacyTotal,
        })
      }

      setInvoiceItems(items)
      setTotalAmount(consultationFee + mockLabFees + mockPharmacyTotal)
    } else {
      setInvoiceItems([])
      setTotalAmount(0)
      setLabFees(0)
      setPharmacyTotal(0)
    }
  }, [patient, consultationFee])

  const handleConfirmPayment = async () => {
    setIsProcessing(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Update visit status to DISCHARGED
    // In production: await updateVisitStatus(patient.visitId, 'Discharged')
    
    // Update hospital revenue
    // In production: await updateHospitalRevenue(totalAmount)

    setIsProcessing(false)
    setShowReceipt(true)
  }

  if (!patient) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <Calculator size={64} className="mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-semibold text-primary mb-2">No Patient Selected</h3>
          <p className="text-sm text-secondary">
            Select a patient from the pending bills list to generate an invoice
          </p>
        </div>
      </div>
    )
  }

  if (showReceipt) {
    return (
      <InvoiceReceipt
        patient={patient}
        invoiceItems={invoiceItems}
        totalAmount={totalAmount}
        onClose={() => {
          setShowReceipt(false)
          onPaymentComplete()
        }}
      />
    )
  }

  return (
    <div className="h-full flex flex-col p-8">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary mb-1">Invoice Generator</h2>
            <p className="text-sm text-secondary">Patient: {patient.patientName}</p>
          </div>
          <div className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
            <p className="text-xs text-secondary">Visit ID</p>
            <p className="text-sm font-semibold text-cyan-400">{patient.visitId}</p>
          </div>
        </div>

        {/* Invoice Breakdown */}
        <div className="glass rounded-xl border border-slate-800/50 overflow-hidden">
          <div className="p-6 border-b border-slate-800/50">
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-cyan-400" />
              <h3 className="text-lg font-semibold text-primary">Bill Breakdown</h3>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-4">
              {/* Consultation Fee */}
              <div className="flex items-center justify-between py-3 border-b border-slate-800/30">
                <div>
                  <p className="text-sm font-medium text-primary">Consultation Fee</p>
                  <p className="text-xs text-secondary mt-0.5">Standard consultation</p>
                </div>
                <p className="text-sm font-semibold text-primary">${consultationFee.toFixed(2)}</p>
              </div>

              {/* Lab/X-Ray Fees */}
              {labFees > 0 && (
                <div className="flex items-center justify-between py-3 border-b border-slate-800/30">
                  <div>
                    <p className="text-sm font-medium text-primary">Lab/X-Ray Fees</p>
                    <p className="text-xs text-secondary mt-0.5">Diagnostic services</p>
                  </div>
                  <p className="text-sm font-semibold text-primary">${labFees.toFixed(2)}</p>
                </div>
              )}

              {/* Pharmacy Total */}
              {pharmacyTotal > 0 && (
                <div className="flex items-center justify-between py-3 border-b border-slate-800/30">
                  <div>
                    <p className="text-sm font-medium text-primary">Pharmacy Total</p>
                    <p className="text-xs text-secondary mt-0.5">Prescribed medications</p>
                  </div>
                  <p className="text-sm font-semibold text-primary">${pharmacyTotal.toFixed(2)}</p>
                </div>
              )}

              {/* Total Amount */}
              <div className="flex items-center justify-between py-4 mt-4 border-t-2 border-cyan-500/30">
                <div>
                  <p className="text-base font-semibold text-primary">Total Amount</p>
                  <p className="text-xs text-secondary mt-0.5">Including all services</p>
                </div>
                <p className="text-2xl font-bold text-cyan-400">${totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            onClick={handleConfirmPayment}
            disabled={isProcessing || totalAmount === 0}
            className="px-6 py-3 bg-emerald-500/10 text-emerald-400 border-2 border-emerald-500/30 rounded-lg font-semibold hover:bg-emerald-500/15 hover:border-emerald-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-400 border-t-transparent"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                <span>Confirm Payment & Print</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

