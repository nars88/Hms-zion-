'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import PrescriptionDetails from '@/components/pharmacy/PrescriptionDetails'
import QRSearchBar from '@/components/shared/QRSearchBar'

export default function AdminPharmacyPage() {
  const searchParams = useSearchParams()
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null)
  const [loadingOrder, setLoadingOrder] = useState(false)
  const visitId = searchParams.get('visitId')
  const patientId = searchParams.get('patientId')

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
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-800/50 bg-slate-900/30 flex-shrink-0 w-full">
        <QRSearchBar
          placeholder="Search Patient or Scan QR Code"
          onSearch={() => {}}
        />
      </div>
      <main className="flex-1 overflow-hidden w-full min-w-0">
        {selectedPrescription ? (
          <div className="w-full h-full">
            <PrescriptionDetails
              prescription={selectedPrescription}
              onBack={() => setSelectedPrescription(null)}
            />
          </div>
        ) : loadingOrder ? (
          <div className="h-full w-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500 border-t-transparent mx-auto mb-3" />
              <p className="text-sm text-slate-400">Loading order...</p>
            </div>
          </div>
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4 opacity-20">💊</div>
              <p className="text-lg text-slate-400 font-medium">Select a prescription to view details</p>
              <p className="text-sm text-slate-600 mt-2">Use a link with visitId or patientId to open an order</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
