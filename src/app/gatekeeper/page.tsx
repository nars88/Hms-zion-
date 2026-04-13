'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import QRSearchBar from '@/components/shared/QRSearchBar'
import BackButton from '@/components/BackButton'
import { CheckCircle, XCircle, AlertCircle, DollarSign } from 'lucide-react'
import { useCentralizedBilling } from '@/contexts/CentralizedBillingContext'
import { useQRScanner } from '@/contexts/QRScannerContext'
import { useAuth } from '@/contexts/AuthContext'

type PaymentStatus = 'paid' | 'unpaid' | 'pending' | null

interface PaymentCheckResult {
  status: PaymentStatus
  patientName?: string
  visitId?: string
  balance?: number
  total?: number
}

export default function GatekeeperDashboard() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { getInvoice } = useCentralizedBilling()
  const { lastScannedId } = useQRScanner()
  const [searchValue, setSearchValue] = useState('')
  const [checkResult, setCheckResult] = useState<PaymentCheckResult | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Hide sidebar for Security users (privacy - no access to medical/financial data)
  const showSidebar = user?.role !== 'SECURITY'

  const checkPaymentStatus = useCallback(async (visitId: string) => {
    if (!visitId.trim()) return

    setIsChecking(true)
    setCheckResult(null)

    try {
      // First, try to get from context
      const invoice = getInvoice(visitId)

      if (invoice) {
        const status: PaymentStatus =
          invoice.status === 'Paid'
            ? 'paid'
            : invoice.status === 'Pending' || invoice.status === 'Partial'
              ? 'pending'
              : 'unpaid'

        setCheckResult({
          status,
          patientName: invoice.patientName || 'Unknown Patient',
          visitId: invoice.visitId,
          balance: status === 'paid' ? 0 : Number(invoice.total) - (Number(invoice.paidAmount) || 0),
          total: Number(invoice.total),
        })
        setIsChecking(false)
        return
      }

      // If not in context, fetch from API
      const res = await fetch('/api/accountant/pending-bills')
      if (res.ok) {
        const data = await res.json()
        const bill = data.bills?.find((b: any) => b.bill.visitId === visitId || b.visitId === visitId)

        if (bill) {
          const status: PaymentStatus =
            bill.bill.paymentStatus === 'Paid' || bill.bill.paymentStatus === 'COMPLETED'
              ? 'paid'
              : bill.bill.paymentStatus === 'Pending'
              ? 'pending'
              : 'unpaid'

          setCheckResult({
            status,
            patientName: bill.patientName || 'Unknown Patient',
            visitId: bill.bill.visitId || bill.visitId,
            balance: status === 'paid' ? 0 : Number(bill.bill.total) - (Number(bill.bill.paidAmount) || 0),
            total: Number(bill.bill.total),
          })
        } else {
          // Visit not found
          setCheckResult({
            status: null,
            patientName: 'Unknown',
            visitId: visitId,
          })
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error)
      setCheckResult({
        status: null,
        patientName: 'Error',
        visitId: visitId,
      })
    } finally {
      setIsChecking(false)
    }
  }, [getInvoice])

  // Handle QR Scanner input
  useEffect(() => {
    if (lastScannedId) {
      setSearchValue(lastScannedId)
      checkPaymentStatus(lastScannedId)
    }
  }, [lastScannedId, checkPaymentStatus])

  // Handle URL params (from navigation)
  useEffect(() => {
    const visitId = searchParams.get('visitId')
    if (visitId) {
      setSearchValue(visitId)
      checkPaymentStatus(visitId)
    }
  }, [searchParams, checkPaymentStatus])

  // Auto-reset after showing result
  useEffect(() => {
    if (checkResult) {
      // Clear any existing timeout
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current)
      }

      // Set new timeout to reset after 4 seconds
      resetTimeoutRef.current = setTimeout(() => {
        setCheckResult(null)
        setSearchValue('')
        setIsChecking(false)
      }, 4000) // 4 seconds
    }

    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current)
      }
    }
  }, [checkResult])

  const handleSearch = (value: string) => {
    if (value.trim()) {
      checkPaymentStatus(value.trim())
    }
  }

  // Determine screen color based on result
  const getScreenColor = () => {
    if (!checkResult) return 'bg-[#0B1120]'
    if (checkResult.status === 'paid') return 'bg-emerald-500'
    if (checkResult.status === 'unpaid' || checkResult.status === 'pending') return 'bg-rose-500'
    return 'bg-[#0B1120]'
  }

  return (
    <ProtectedRoute allowedRoles={['SECURITY', 'ADMIN']} redirectTo="/">
      <div className={`flex h-screen overflow-hidden transition-colors duration-500 ${getScreenColor()}`}>
        <SmartSidebar />
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
          {/* Header Info - Only show when result is available */}
          {checkResult && checkResult.patientName && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
              <div className="glass rounded-xl border-2 border-white/20 p-4 backdrop-blur-sm">
                <p className="text-sm font-semibold text-white/90 mb-1">
                  Patient: <span className="font-bold">{checkResult.patientName}</span>
                </p>
                <p className="text-xs text-white/80">
                  Visit ID: <span className="font-mono">{checkResult.visitId}</span>
                </p>
              </div>
            </div>
          )}

          {/* Main Content - Centered */}
          <div className="w-full max-w-2xl space-y-8">
            {/* Search Bar - Always visible and focused */}
            <div className="relative z-20">
              <QRSearchBar
                placeholder="Scan QR Code or Enter Visit ID"
                onSearch={handleSearch}
                autoFocus={true}
                className="w-full"
              />
            </div>

            {/* Result Display */}
            {isChecking ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/30 border-t-white"></div>
                <p className="text-lg font-semibold text-white/90">Checking payment status...</p>
              </div>
            ) : checkResult ? (
              <div className="flex flex-col items-center justify-center space-y-6 py-12">
                {checkResult.status === 'paid' ? (
                  <>
                    <div className="relative">
                      <CheckCircle size={120} className="text-white drop-shadow-2xl" strokeWidth={3} />
                      <div className="absolute inset-0 animate-ping">
                        <CheckCircle size={120} className="text-white/30" strokeWidth={3} />
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <h2 className="text-5xl font-bold text-white drop-shadow-lg">PAID</h2>
                      <p className="text-2xl font-semibold text-white/95 drop-shadow-md">ACCESS GRANTED</p>
                    </div>
                  </>
                ) : checkResult.status === 'unpaid' || checkResult.status === 'pending' ? (
                  <>
                    <div className="relative">
                      <XCircle size={120} className="text-white drop-shadow-2xl" strokeWidth={3} />
                      <div className="absolute inset-0 animate-pulse">
                        <XCircle size={120} className="text-white/30" strokeWidth={3} />
                      </div>
                    </div>
                    <div className="text-center space-y-3">
                      <h2 className="text-4xl font-bold text-white drop-shadow-lg">
                        PAYMENT PENDING
                      </h2>
                      <p className="text-2xl font-semibold text-white/95 drop-shadow-md">
                        RETURN TO ACCOUNTANT
                      </p>
                      {checkResult.balance !== undefined && checkResult.balance > 0 && (
                        <div className="mt-4 p-4 bg-white/20 backdrop-blur-sm rounded-lg border-2 border-white/30">
                          <p className="text-sm text-white/90 mb-1">Outstanding Balance:</p>
                          <p className="text-3xl font-bold text-white">
                            {checkResult.balance.toLocaleString()} IQD
                          </p>
                          {checkResult.total && (
                            <p className="text-xs text-white/80 mt-1">
                              Total: {checkResult.total.toLocaleString()} IQD
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle size={80} className="text-white/80" />
                    <div className="text-center space-y-2">
                      <h2 className="text-2xl font-bold text-white">Visit Not Found</h2>
                      <p className="text-lg text-white/90">Please check the QR code and try again</p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              // Default state - Instructions
              <div className="flex flex-col items-center justify-center space-y-4 py-12">
                <div className="p-6 bg-white/10 backdrop-blur-sm rounded-2xl border-2 border-white/20">
                  <div className="text-center space-y-3">
                    <DollarSign size={64} className="mx-auto text-white/60" />
                    <h3 className="text-xl font-semibold text-white/90">Payment Verification</h3>
                    <p className="text-sm text-white/80 max-w-md">
                      Scan the patient&apos;s QR code or enter the Visit ID to check payment status
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Auto-reset countdown indicator */}
          {checkResult && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
              <div className="px-4 py-2 bg-black/30 backdrop-blur-sm rounded-full border border-white/20">
                <p className="text-xs text-white/80">
                  Auto-resetting in a few seconds...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      <BackButton />
    </ProtectedRoute>
  )
}
