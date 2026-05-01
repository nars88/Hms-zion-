'use client'

import { useState, useEffect } from 'react'
import ReceiptModal from './ReceiptModal'
import { CreditCard, Banknote, CheckCircle, Calculator, Printer } from 'lucide-react'
import { useRevenue } from '@/contexts/RevenueContext'
import { useLabResults } from '@/contexts/LabResultsContext'
import { useCentralizedBilling } from '@/contexts/CentralizedBillingContext'
import { useWaitingList } from '@/contexts/WaitingListContext'
import { formatNumber } from '@/lib/locale'

interface PaymentProcessorProps {
  patient: any
  onPaymentComplete: () => void
}

type PaymentMethod = 'Cash' | 'Card'

interface BillingItem {
  category: 'Consultation' | 'Tests' | 'Medicines' | 'ER Procedures'
  description: string
  quantity: number
  unitPrice: number
  total: number
  addedAt?: string // Timestamp for ER procedures
}

export default function PaymentProcessor({ patient, onPaymentComplete }: PaymentProcessorProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash')
  const [showReceipt, setShowReceipt] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [billingItems, setBillingItems] = useState<BillingItem[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const { addRevenue } = useRevenue()
  const { getLabResultsForPatient } = useLabResults()
  const { getInvoice, addPayment, updateInvoiceStatus } = useCentralizedBilling()
  const { updatePatientStatus } = useWaitingList()

  // Calculate billing breakdown when patient is selected
  useEffect(() => {
    if (patient) {
      // Get invoice using Visit ID (this is the source of truth)
      const visitId = patient.visitId || `VISIT-${patient.patientId || patient.id}`
      const invoice = getInvoice(visitId)
      
      console.log(`[Cashier] Patient selected: ${patient.patientName}, Visit ID: ${visitId}`)
      
      if (invoice) {
        console.log(`[Cashier] Invoice found: ${invoice.id}, Total: ${invoice.total} IQD`)
        console.log(`[Cashier] Invoice items:`, invoice.items)
        
        // Convert invoice items to billing items format with timestamps for ER procedures
        const items: BillingItem[] = invoice.items.map(item => {
          const isERProcedure = item.description.includes('ER Procedure:') || item.description.includes('ER Consultation')
          return {
            category: isERProcedure ? 'ER Procedures' :
                     item.department === 'Doctor' ? 'Consultation' : 
                     item.department === 'Radiology' || item.department === 'Laboratory' ? 'Tests' : 
                     'Medicines',
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            addedAt: item.addedAt, // Include timestamp for ER procedures
          }
        })
        
        setBillingItems(items)
        setTotalAmount(invoice.total)
      } else {
        console.warn(`[Cashier] No invoice found for Visit ID: ${visitId}`)
        // Fallback to old calculation if invoice not found
        const doctorVisitFee = 50000
        const labResults = getLabResultsForPatient(patient.patientId || patient.id)
        const labTests = labResults.map((result) => ({
          name: result.testType,
          price: 25000,
        }))
        const labTotal = labTests.reduce((sum, test) => sum + test.price, 0)
        
        const items: BillingItem[] = [
          {
            category: 'Consultation',
            description: 'Doctor Visit',
            quantity: 1,
            unitPrice: doctorVisitFee,
            total: doctorVisitFee,
          },
          ...labTests.map(test => ({
            category: 'Tests' as const,
            description: test.name,
            quantity: 1,
            unitPrice: test.price,
            total: test.price,
          })),
        ]
        
        setBillingItems(items)
        setTotalAmount(doctorVisitFee + labTotal)
      }
    } else {
      setBillingItems([])
      setTotalAmount(0)
    }
  }, [patient, getLabResultsForPatient, getInvoice])

  const handleConfirmPayment = async () => {
    setIsProcessing(true)

    // Get invoice using Visit ID
    const visitId = patient.visitId || `VISIT-${patient.patientId || patient.id}`
    const invoice = getInvoice(visitId)
    
    console.log(`[Cashier Payment] Processing payment for Visit ID: ${visitId}, Amount: ${totalAmount} IQD`)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    if (invoice) {
      // Add payment to invoice
      addPayment(visitId, {
        amount: totalAmount,
        method: paymentMethod,
        paidBy: 'cashier-id', // In production, use actual cashier ID
      })
      
      // Update invoice status to Paid
      updateInvoiceStatus(visitId, 'Paid')
      
      console.log(`[Cashier Payment] Invoice ${invoice.id} marked as Paid`)
    }
    
    // Update global hospital revenue
    addRevenue(totalAmount)
    console.log(`[Cashier Payment] Revenue updated: +${totalAmount} IQD`)
    
    // Mark patient as Discharged after payment
    const patientId = patient.patientId || patient.id
    updatePatientStatus(patientId, 'Discharged')
    console.log(`[Cashier Payment] Patient ${patientId} marked as Discharged`)

    setIsProcessing(false)
    setShowReceipt(true)
  }

  const handlePrintInvoice = () => {
    // Create a print-friendly window
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const visitId = patient.visitId || `VISIT-${patient.patientId || patient.id}`
    const invoice = getInvoice(visitId)
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

    // Group items by category
    const consultationItems = billingItems.filter(item => item.category === 'Consultation')
    const erProcedureItems = billingItems.filter(item => item.category === 'ER Procedures')
    const testItems = billingItems.filter(item => item.category === 'Tests')
    const medicineItems = billingItems.filter(item => item.category === 'Medicines')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>NARS Hospital - Invoice</title>
          <style>
            @media print {
              @page { size: A5; margin: 10mm; }
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              padding: 20px;
              max-width: 148mm;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .hospital-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .patient-info {
              margin: 15px 0;
              padding: 10px;
              background: #f5f5f5;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              padding: 5px 0;
              border-bottom: 1px dotted #ccc;
            }
            .item-name {
              flex: 1;
            }
            .item-time {
              font-size: 10px;
              color: #666;
              margin-top: 2px;
            }
            .item-price {
              font-weight: bold;
            }
            .section-header {
              font-weight: bold;
              margin-top: 15px;
              margin-bottom: 5px;
              text-transform: uppercase;
              font-size: 11px;
            }
            .total {
              margin-top: 20px;
              padding-top: 10px;
              border-top: 2px solid #000;
              display: flex;
              justify-content: space-between;
              font-size: 16px;
              font-weight: bold;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 10px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="hospital-name">ZION HOSPITAL</div>
            <div>Official Invoice</div>
          </div>
          
          <div class="patient-info">
            <div><strong>Patient:</strong> ${patient.patientName}</div>
            <div><strong>Date:</strong> ${currentDate}</div>
            <div><strong>Visit ID:</strong> ${visitId}</div>
            ${patient.diagnosis ? `<div><strong>Diagnosis:</strong> ${patient.diagnosis}</div>` : ''}
          </div>

          <div class="section-header">Consultation</div>
          ${consultationItems.map(item => `
            <div class="item-row">
              <div class="item-name">${item.description}</div>
              <div class="item-price">${formatNumber(item.total)} IQD</div>
            </div>
          `).join('')}

          ${erProcedureItems.length > 0 ? `
            <div class="section-header">Emergency Procedures</div>
            ${erProcedureItems.map(item => `
              <div class="item-row">
                <div class="item-name">
                  ${item.description.replace('ER Procedure: ', '')}
                  ${item.addedAt ? `<div class="item-time">Performed: ${new Date(item.addedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>` : ''}
                </div>
                <div class="item-price">${formatNumber(item.total)} IQD</div>
              </div>
            `).join('')}
          ` : ''}

          ${testItems.length > 0 ? `
            <div class="section-header">Tests</div>
            ${testItems.map(item => `
              <div class="item-row">
                <div class="item-name">${item.description}</div>
                <div class="item-price">${formatNumber(item.total)} IQD</div>
              </div>
            `).join('')}
          ` : ''}

          ${medicineItems.length > 0 ? `
            <div class="section-header">Medicines</div>
            ${medicineItems.map(item => `
              <div class="item-row">
                <div class="item-name">${item.description}</div>
                <div class="item-price">${formatNumber(item.total)} IQD</div>
              </div>
            `).join('')}
          ` : ''}

          <div class="total">
            <div>GRAND TOTAL:</div>
            <div>${formatNumber(totalAmount)} IQD</div>
          </div>

          <div class="footer">
            <div>Payment Method: ${paymentMethod}</div>
            <div style="margin-top: 10px;">Thank you for choosing NARS Hospital</div>
            <div>This is an official invoice. Please keep it for your records.</div>
          </div>
        </body>
      </html>
    `)
    
    printWindow.document.close()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  if (!patient) {
    return (
      <div className="h-full flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <Calculator size={64} className="mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-semibold text-primary mb-2">No Patient Selected</h3>
          <p className="text-sm text-secondary">
            Select a patient from the live feed to process payment
          </p>
        </div>
      </div>
    )
  }

    if (showReceipt) {
    return (
      <ReceiptModal
        patient={patient}
        totalAmount={totalAmount}
        paymentMethod={paymentMethod}
        billingItems={billingItems}
        onClose={() => {
          setShowReceipt(false)
          onPaymentComplete()
        }}
      />
    )
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left Side: Patient Info + Scrollable Invoice Items */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Patient Header - Fixed */}
        <div className="flex-shrink-0 p-6 border-b border-slate-800/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-primary mb-1">{patient.patientName}</h2>
              <div className="flex items-center gap-4 mt-2">
                <p className="text-sm text-secondary">ID: <span className="text-primary font-medium">{patient.patientId}</span></p>
                <p className="text-sm text-secondary">Visit: <span className="text-primary font-medium">{patient.visitId}</span></p>
              </div>
              <p className="text-sm text-secondary mt-2">Diagnosis: <span className="text-primary font-medium">{patient.diagnosis}</span></p>
            </div>
          </div>
        </div>

        {/* Scrollable Invoice Items */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">Unified Invoice Summary</h3>
              <button
                onClick={handlePrintInvoice}
                className="px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/15 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Printer size={16} />
                <span>Print Final Invoice</span>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Consultation */}
              {billingItems.filter(item => item.category === 'Consultation').length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-400 mb-2 uppercase tracking-wide">Consultation</p>
                  <div className="space-y-2">
                    {billingItems.filter(item => item.category === 'Consultation').map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-slate-800/30">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-primary">{item.description}</p>
                          <p className="text-xs text-secondary">Qty: {item.quantity} × {formatNumber(item.unitPrice)} IQD</p>
                        </div>
                        <p className="text-sm font-semibold text-primary">{formatNumber(item.total)} IQD</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ER Procedures - With Timestamps */}
              {billingItems.filter(item => item.category === 'ER Procedures').length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-rose-400 mb-2 uppercase tracking-wide">Emergency Procedures</p>
                  <div className="space-y-2">
                    {billingItems.filter(item => item.category === 'ER Procedures').map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-slate-800/30">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-primary">
                            {item.description.replace('ER Procedure: ', '').replace('ER Consultation (Fast Track)', 'ER Consultation')}
                          </p>
                          {item.addedAt && (
                            <p className="text-xs text-rose-300">
                              Performed: {new Date(item.addedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                          )}
                          <p className="text-xs text-secondary">Qty: {item.quantity} × {formatNumber(item.unitPrice)} IQD</p>
                        </div>
                        <p className="text-sm font-semibold text-primary">{formatNumber(item.total)} IQD</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tests */}
              {billingItems.filter(item => item.category === 'Tests').length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wide">Tests</p>
                  <div className="space-y-2">
                    {billingItems.filter(item => item.category === 'Tests').map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-slate-800/30">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-primary">{item.description}</p>
                          <p className="text-xs text-secondary">Qty: {item.quantity} × {formatNumber(item.unitPrice)} IQD</p>
                        </div>
                        <p className="text-sm font-semibold text-primary">{formatNumber(item.total)} IQD</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medicines */}
              {billingItems.filter(item => item.category === 'Medicines').length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-400 mb-2 uppercase tracking-wide">Medicines</p>
                  <div className="space-y-2">
                    {billingItems.filter(item => item.category === 'Medicines').map((item, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-slate-800/30">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-primary">{item.description}</p>
                          <p className="text-xs text-secondary">Qty: {item.quantity} × {formatNumber(item.unitPrice)} IQD</p>
                        </div>
                        <p className="text-sm font-semibold text-primary">{formatNumber(item.total)} IQD</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grand Total */}
              <div className="mt-6 pt-4 border-t-2 border-emerald-500/30">
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-primary">Grand Total</p>
                  <p className="text-2xl font-bold text-emerald-400">{formatNumber(totalAmount)} IQD</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Fixed Payment Sidebar */}
      <div className="w-96 flex-shrink-0 border-l border-slate-800/50 flex flex-col overflow-hidden bg-slate-900/20">
        {/* Total Amount - Very Large and Bold */}
        <div className="flex-shrink-0 p-8 border-b border-slate-800/50">
          <p className="text-xs font-semibold text-secondary uppercase tracking-wider mb-3">Total Amount</p>
          <p className="text-6xl font-bold text-emerald-400 leading-tight">
            {formatNumber(totalAmount)}
          </p>
          <p className="text-lg text-secondary mt-2">IQD</p>
        </div>

        {/* Payment Method Selection */}
        <div className="flex-shrink-0 p-6 border-b border-slate-800/50">
          <h3 className="text-sm font-semibold text-primary mb-4">Payment Method</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Cash Option */}
            <button
              onClick={() => setPaymentMethod('Cash')}
              className={`p-4 rounded-lg border-2 transition-all ${
                paymentMethod === 'Cash'
                  ? 'bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/5'
                  : 'bg-slate-900/30 border-slate-800/50 hover:border-slate-700/50'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    paymentMethod === 'Cash'
                      ? 'bg-blue-500/20 border-2 border-blue-500/40'
                      : 'bg-slate-800/50 border-2 border-slate-700/50'
                  }`}
                >
                  <Banknote
                    size={20}
                    className={paymentMethod === 'Cash' ? 'text-blue-400' : 'text-slate-500'}
                  />
                </div>
                <p
                  className={`text-xs font-semibold ${
                    paymentMethod === 'Cash' ? 'text-blue-400' : 'text-secondary'
                  }`}
                >
                  Cash
                </p>
              </div>
            </button>

            {/* Card Option */}
            <button
              onClick={() => setPaymentMethod('Card')}
              className={`p-4 rounded-lg border-2 transition-all ${
                paymentMethod === 'Card'
                  ? 'bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/5'
                  : 'bg-slate-900/30 border-slate-800/50 hover:border-slate-700/50'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    paymentMethod === 'Card'
                      ? 'bg-blue-500/20 border-2 border-blue-500/40'
                      : 'bg-slate-800/50 border-2 border-slate-700/50'
                  }`}
                >
                  <CreditCard
                    size={20}
                    className={paymentMethod === 'Card' ? 'text-blue-400' : 'text-slate-500'}
                  />
                </div>
                <p
                  className={`text-xs font-semibold ${
                    paymentMethod === 'Card' ? 'text-blue-400' : 'text-secondary'
                  }`}
                >
                  Card
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Fixed Confirm Payment Button - Extra Large */}
        <div className="flex-1 flex items-end p-6">
          <button
            onClick={handleConfirmPayment}
            disabled={isProcessing || totalAmount === 0}
            className="w-full py-6 bg-emerald-500 text-emerald-50 border-2 border-emerald-400 rounded-xl font-bold text-xl hover:bg-emerald-600 hover:border-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/20"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-3 border-emerald-50 border-t-transparent"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle size={28} className="stroke-[3]" />
                <span>Confirm Payment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

