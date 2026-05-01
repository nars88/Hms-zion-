'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import { USER_ROLES, useAuth } from '@/contexts/AuthContext'
import { DollarSign, Lock, Unlock, Receipt } from 'lucide-react'
import { printInvoice } from '@/lib/printUtils'
import QRSearchBar from '@/components/shared/QRSearchBar'
import BackButton from '@/components/BackButton'
import { Invoice, InvoiceItem } from '@/types/billing'
import MedicalReceipt from '@/components/shared/MedicalReceipt'

type InvoiceView = 'all' | 'pending' | 'completed'

export default function AccountantDashboard() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isDischarging, setIsDischarging] = useState(false)
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false)
  
  const router = useRouter()
  
  // State for active tab (simple state management)
  const [activeTab, setActiveTab] = useState<InvoiceView>('all')
  const qrVisitId = searchParams.get('visitId')
  const qrPatientId = searchParams.get('patientId')
  
  // Sync with URL params on mount
  useEffect(() => {
    const viewParam = searchParams.get('view') as InvoiceView
    if (viewParam && ['all', 'pending', 'completed'].includes(viewParam)) {
      setActiveTab(viewParam)
    }
  }, [searchParams])

  // Reset View on Tab Change: Clear selected invoice when tab changes
  useEffect(() => {
    setSelectedInvoice(null)
  }, [activeTab])

  // Update URL when tab changes (sync with SmartSidebar)
  const handleTabChange = (tab: InvoiceView) => {
    setActiveTab(tab)
    router.push(`/accountant?view=${tab}`)
  }

  const loadInvoices = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const res = await fetch('/api/accountant/all-bills')
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Failed to load pending bills')
      }

      const data = await res.json()
      // Transform the data to match the expected format
      const transformedInvoices = data.bills.map((bill: any) => {
        // Parse patient name to extract firstName and lastName
        const nameParts = bill.patientName?.split(' ') || ['Unknown', 'Patient']
        const firstName = nameParts[0] || 'Unknown'
        const lastName = nameParts.slice(1).join(' ') || 'Patient'
        
        const subtotal = Number(bill.bill.subtotal) || 0
        const tax = Number(bill.bill.tax) || 0
        const discount = Number(bill.bill.discount) || 0
        const rawTotal = Number(bill.bill.total)
        const computedTotal = subtotal + tax - discount
        const safeTotal = Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : computedTotal

        return {
          id: bill.bill.id,
          visitId: bill.visitId,
          patient: {
            id: bill.patientId,
            firstName: firstName,
            lastName: lastName,
            phone: bill.patientPhone || '',
          },
          items: bill.bill.items,
          subtotal,
          tax,
          discount,
          total: safeTotal,
          paymentStatus: bill.bill.paymentStatus,
          paymentMethod: bill.bill.paymentMethod,
          qrCode: bill.bill.qrCode,
          qrStatus: bill.bill.qrStatus,
          paidAt: bill.bill.paidAt,
          createdAt: bill.bill.createdAt,
          updatedAt: bill.bill.updatedAt,
          hasUndispensedMedications: Boolean(bill.hasUndispensedMedications),
          undispensedMedicationStatus: bill.undispensedMedicationStatus || null,
        }
      })
      setInvoices(transformedInvoices)
    } catch (err: any) {
      console.error('❌ Failed to load invoices:', err)
      setError(err?.message || 'Failed to load invoices')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInvoices()
    const tick = () => {
      if (document.visibilityState === 'visible') loadInvoices()
    }
    const interval = setInterval(tick, 10000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const ch = new BroadcastChannel('zion-billing')
    ch.onmessage = (ev: MessageEvent) => {
      if ((ev?.data as { type?: string } | undefined)?.type === 'billing-updated') {
        void loadInvoices()
      }
    }
    return () => ch.close()
  }, [])

  // Handle QR Scanner navigation
  useEffect(() => {
    if ((!qrVisitId && !qrPatientId) || invoices.length === 0) return
    const invoice = invoices.find(
      (inv) => inv.visitId === qrVisitId || inv.patient.id === qrPatientId
    )
    if (invoice) setSelectedInvoice(invoice)
  }, [qrVisitId, qrPatientId, invoices])

  const handleDischarge = async () => {
    if (!selectedInvoice || (selectedInvoice.paymentStatus !== 'Paid' && selectedInvoice.paymentStatus !== 'COMPLETED')) return
    if (!confirm('Discharge this patient? They will be archived and the bed (if ER) will be freed.')) return
    setIsDischarging(true)
    try {
      const res = await fetch(`/api/visits/${selectedInvoice.visitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Discharged', bedNumber: null }),
      })
      if (!res.ok) throw new Error('Failed to discharge')
      setSelectedInvoice(null)
      await loadInvoices()
    } catch (e: any) {
      alert(e?.message || 'Failed to discharge')
    } finally {
      setIsDischarging(false)
    }
  }

  // Filter invoices based on active tab
  const filteredInvoices = invoices.filter((inv) => {
    if (activeTab === 'pending') {
      return inv.paymentStatus === 'Pending' || inv.paymentStatus === 'UNPAID'
    } else if (activeTab === 'completed') {
      return inv.paymentStatus === 'Paid' || inv.paymentStatus === 'COMPLETED'
    }
    return true // 'all' - show all invoices
  })

  const handleMarkAsPaid = async (invoice: Invoice) => {
    if (!user?.id) {
      alert('Session expired. Please log in again.')
      return
    }
    if (!confirm('Confirm Payment?\n\nThis will:\n- Mark the bill as PAID\n- Unlock the QR exit gate\n- Archive the visit')) {
      return
    }

    try {
      setIsConfirmingPayment(true)
      const res = await fetch('/api/accountant/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: invoice.visitId,
          paymentMethod: 'Cash', // Default, can be enhanced with a dropdown
          confirmedBy: user.id,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to confirm payment')
      }

      // Data Refresh: Close details panel automatically after Confirm Payment
      setSelectedInvoice(null)
      
      alert('✅ Payment confirmed successfully!\n\nBill marked as PAID. QR Status: CLEARED (Green).')
      await loadInvoices()
      
      // If currently on pending tab, switch to completed to show the updated record
      if (activeTab === 'pending') {
        setActiveTab('completed')
      }
    } catch (err: any) {
      console.error('❌ Failed to confirm payment:', err)
      alert(`❌ Failed to confirm payment: ${err?.message || 'Unknown error'}`)
    } finally {
      setIsConfirmingPayment(false)
    }
  }

  return (
    <ProtectedRoute
      allowedRoles={[USER_ROLES.ACCOUNTANT, USER_ROLES.ADMIN]}
      redirectTo="/"
    >
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        {/* Global Sidebar Component - Same as Admin and Reception */}
        <SmartSidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Minimal top bar — content starts high */}
          <div className="py-1.5 px-4 border-b border-slate-800/50 bg-slate-900/30 flex-shrink-0">
            <QRSearchBar
              placeholder="Search Patient or Scan QR Code"
              onSearch={(value) => {
                // Handle manual search if needed
                void value
              }}
            />
          </div>
          {/* Main Content — fills remaining height with no extra top padding */}
          <main className="flex-1 flex overflow-hidden min-h-0">
            {/* Left: Invoice List */}
            <div className="w-96 flex-shrink-0 border-r border-slate-800/50 overflow-hidden flex flex-col">
              {/* Invoice List Header */}
              <div className="p-3 border-b border-slate-800/50 flex-shrink-0">
                <h2 className="text-base font-semibold text-primary mb-0.5">
                  {activeTab === 'all' && 'All Invoices'}
                  {activeTab === 'pending' && 'Pending Payments'}
                  {activeTab === 'completed' && 'Completed Transactions'}
                </h2>
                <p className="text-xs text-secondary">
                  {filteredInvoices.length} invoice(s)
                  {activeTab === 'pending' && ' awaiting payment'}
                  {activeTab === 'completed' && ' paid'}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {isLoading && filteredInvoices.length === 0 ? (
                  <div className="space-y-3 py-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-16 rounded-xl bg-slate-800/60 animate-pulse" />
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-center py-12 px-4">
                    <p className="text-sm text-rose-400">{error}</p>
                    <button
                      onClick={loadInvoices}
                      className="mt-3 text-xs text-emerald-400 hover:text-emerald-300 underline"
                    >
                      Retry
                    </button>
                  </div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign size={48} className="mx-auto mb-4 text-slate-600 opacity-50" />
                    <p className="text-sm text-secondary">
                      No invoices found in this section.
                    </p>
                  </div>
                ) : (
                  filteredInvoices.map(invoice => {
                    const isPaid = invoice.paymentStatus === 'Paid' || invoice.paymentStatus === 'COMPLETED'
                    const isCleared = invoice.qrStatus === 'CLEARED'

                    return (
                      <button
                        key={invoice.id}
                        onClick={() => setSelectedInvoice(invoice)}
                        className={`w-full text-left p-3 rounded-xl border transition-all ${
                          selectedInvoice?.id === invoice.id
                            ? 'bg-emerald-500/10 border-emerald-500/30 shadow-lg'
                            : 'glass border-slate-800/50 hover:border-slate-700/50'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-semibold text-primary truncate">
                              {invoice.patient.firstName} {invoice.patient.lastName}
                            </h3>
                            <p className="text-xs text-secondary mt-0.5">
                              {invoice.patient.phone}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2">
                            {isCleared ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 rounded text-[10px] font-semibold text-emerald-300">
                                <Unlock className="h-3 w-3" />
                                CLEARED
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500/20 border border-red-500/40 rounded text-[10px] font-semibold text-red-300">
                                <Lock className="h-3 w-3" />
                                LOCKED
                              </span>
                            )}
                            {isPaid ? (
                              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-medium text-emerald-400">
                                Paid
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-medium text-amber-400">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-secondary">
                          <p>
                            Total: <span className="font-semibold text-primary">
                              {Number(invoice.total).toLocaleString()} IQD
                            </span>
                          </p>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>

            {/* Right: Premium Medical Receipt — exact flex structure so table scrolls, total/buttons fixed */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {selectedInvoice ? (
                <div className="p-1.5 h-full min-h-0 flex flex-col">
                  {selectedInvoice.hasUndispensedMedications ? (
                    <div className="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                      Note: There are un-dispensed medications in this visit.
                    </div>
                  ) : null}
                  <MedicalReceipt
                    invoice={selectedInvoice}
                    onClose={() => setSelectedInvoice(null)}
                    onPrint={() => {
                      const items = (selectedInvoice.items as InvoiceItem[]) || []
                      printInvoice(items, selectedInvoice.subtotal, selectedInvoice.tax, selectedInvoice.discount, selectedInvoice.total, {
                        title: selectedInvoice.paymentStatus === 'Paid' || selectedInvoice.paymentStatus === 'COMPLETED' ? 'Receipt' : 'Financial Invoice',
                        patientName: `${selectedInvoice.patient.firstName} ${selectedInvoice.patient.lastName}`,
                        patientId: selectedInvoice.patient.id,
                        visitId: selectedInvoice.visitId,
                        date: new Date(selectedInvoice.createdAt).toISOString(),
                      })
                    }}
                    showPaymentActions
                    onConfirmPayment={() => handleMarkAsPaid(selectedInvoice)}
                    onDischarge={handleDischarge}
                    isDischarging={isDischarging}
                    isConfirmingPayment={isConfirmingPayment}
                    allowConfirmPayment={activeTab !== 'completed'}
                  />
                </div>
              ) : (
                // Conditional Rendering: Placeholder when no invoice is selected
                <div className="h-full flex items-center justify-center p-6">
                  <div className="text-center max-w-md">
                    <div className="mb-6">
                      <Receipt size={80} className="mx-auto text-slate-600 opacity-30" />
                    </div>
                    <h3 className="text-xl font-semibold text-primary mb-2">
                      No Invoice Selected
                    </h3>
                    <p className="text-sm text-secondary leading-relaxed">
                      Click on a patient to view their invoice.
                    </p>
                    <div className="mt-6 pt-6 border-t border-slate-800/50">
                      <p className="text-xs text-slate-600">
                        Select an invoice from the list on the left to view full details, service items, and payment status.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      <BackButton />
    </ProtectedRoute>
  )
}

