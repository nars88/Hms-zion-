'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import PrescriptionDetails from '@/components/pharmacy/PrescriptionDetails'
import PharmacyManagerDashboard from '@/components/pharmacy/PharmacyManagerDashboard'
import QRSearchBar from '@/components/shared/QRSearchBar'
import BackButton from '@/components/BackButton'
import { useAuth } from '@/contexts/AuthContext'

export default function PharmacyDashboard() {
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null)
  const [loadingOrder, setLoadingOrder] = useState(false)
  const visitId = searchParams.get('visitId')
  const patientId = searchParams.get('patientId')

  const isManager = user?.role === 'ADMIN'

  // Load order by visitId/patientId from URL (e.g. when navigating from Dashboard)
  useEffect(() => {
    if (!visitId && !patientId) return
    let cancelled = false
    const load = async () => {
      setLoadingOrder(true)
      try {
        const res = await fetch('/api/pharmacy/orders')
        if (!res.ok || cancelled) return
        const data = await res.json()
        const orders = Array.isArray(data) ? data : []
        const match = orders.find((o: any) => o.visitId === visitId || o.patientId === patientId)
        if (match && !cancelled) setSelectedPrescription(match)
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingOrder(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [visitId, patientId])

  return (
    <ProtectedRoute allowedRoles={['PHARMACIST', 'ADMIN']} redirectTo="/">
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 w-full">
          <div className="p-4 border-b border-slate-800/50 bg-slate-900/30 flex-shrink-0 w-full">
            <QRSearchBar
              placeholder="Search Patient or Scan QR Code"
              onSearch={(value) => console.log('Search:', value)}
            />
          </div>

          <main className="flex-1 overflow-hidden min-w-0 w-full">
            {selectedPrescription ? (
              <div className="w-full h-full">
                <PrescriptionDetails
                  prescription={selectedPrescription}
                  onBack={() => setSelectedPrescription(null)}
                />
              </div>
            ) : loadingOrder ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500 border-t-transparent mx-auto mb-3" />
                  <p className="text-sm text-slate-400">Loading order...</p>
                </div>
              </div>
            ) : isManager ? (
              <PharmacyManagerDashboard />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4 opacity-20">💊</div>
                  <p className="text-lg text-slate-400 font-medium">Select a prescription to view details</p>
                  <p className="text-sm text-slate-600 mt-2">Open an order from the Dashboard or use a link with visit/patient ID</p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
      <BackButton />
    </ProtectedRoute>
  )
}
