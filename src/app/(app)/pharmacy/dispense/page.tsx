'use client'

import { useCallback, useEffect, useState } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import LiveOrderFeed from '@/components/pharmacy/LiveOrderFeed'
import DispensingDashboard from '@/components/pharmacy/DispensingDashboard'
import BackButton from '@/components/BackButton'

const TEMP_MANUAL_PHARMACY_PATIENT = {
  id: 'mock-pharmacy-logic-test-1',
  visitId: 'MOCK-VISIT-PHARMACY-LOGIC',
  patientId: 'MOCK-PATIENT-LOGIC-001',
  patientName: 'Pharmacy Logic Test',
  status: 'PENDING',
  diagnosis: 'Structured prescription logic verification',
  prescription: [
    {
      medication: 'Ibuprofen',
      dosage: '400mg',
      frequency: '1 pill every 8 hours',
      duration: 'As prescribed',
      quantity: 1,
      unitPrice: 5000,
      totalPrice: 5000,
      price: 5000,
    },
    {
      medication: 'Amoxicillin',
      dosage: '500mg',
      frequency: '1 pill twice daily',
      duration: 'As prescribed',
      quantity: 1,
      unitPrice: 12000,
      totalPrice: 12000,
      price: 12000,
    },
    {
      medication: 'Paracetamol',
      dosage: '1g',
      frequency: 'As needed',
      duration: 'As prescribed',
      quantity: 1,
      unitPrice: 7000,
      totalPrice: 7000,
      price: 7000,
    },
  ],
  allergies: [],
  createdAt: new Date().toISOString(),
  waitTime: 'Now',
  items: [
    { medicineName: 'Ibuprofen', dosage: '400mg', frequency: '1 pill every 8 hours', quantity: 1, unitPrice: 5000, totalPrice: 5000 },
    { medicineName: 'Amoxicillin', dosage: '500mg', frequency: '1 pill twice daily', quantity: 1, unitPrice: 12000, totalPrice: 12000 },
    { medicineName: 'Paracetamol', dosage: '1g', frequency: 'As needed', quantity: 1, unitPrice: 7000, totalPrice: 7000 },
  ],
}

export default function PharmacyDispensePage() {
  const [orders, setOrders] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [feedError, setFeedError] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    try {
      setLoadingOrders(true)
      setFeedError(null)
      const res = await fetch('/api/pharmacy/orders')
      const data = (await res.json().catch(() => [])) as any[]
      if (!res.ok) {
        throw new Error('Failed to load pharmacy orders')
      }
      const normalized = Array.isArray(data)
        ? data.map((order) => ({
            id: order.id,
            visitId: order.visitId,
            patientId: order.patientId,
            patientName: order.patientName,
            status: 'READY_FOR_PHARMACY',
            diagnosis: order.chiefComplaint || 'No diagnosis recorded.',
            prescription: Array.isArray(order.items)
              ? order.items.map((item: any) => ({
                  medication: item.medicineName || item.name || '—',
                  dosage: item.dosage || item.dose || '—',
                  frequency: item.frequency || item.instructions || 'As prescribed',
                  duration: 'As prescribed',
                  notes: item.notes || '',
                  price: Number(item.price ?? item.unitPrice ?? 0),
                  unitPrice: Number(item.unitPrice ?? item.price ?? 0),
                  totalPrice: Number(item.totalPrice ?? item.price ?? item.unitPrice ?? 0),
                }))
              : [],
            allergies: order.patientAllergies ? [String(order.patientAllergies)] : [],
            createdAt: order.createdAt,
            waitTime: 'Now',
            items: order.items,
            diagnosticResults: order.diagnosticResults,
          }))
        : []
      setOrders([TEMP_MANUAL_PHARMACY_PATIENT, ...normalized])
    } catch (e) {
      setFeedError((e as Error)?.message || 'Failed to load orders')
      setOrders([])
    } finally {
      setLoadingOrders(false)
    }
  }, [])

  useEffect(() => {
    void loadOrders()
    return () => undefined
  }, [loadOrders])

  // Remove patient from active queue and reset detail view (Dispense or Patient Declined / End Visit).
  const handleOrderComplete = () => {
    const currentOrderId = selectedOrder?.id
    setSelectedOrder(null)
    if (currentOrderId != null) {
      setOrders((prev) => prev.filter((order) => order.id !== currentOrderId))
    }
    void loadOrders()
  }

  return (
    <ProtectedRoute allowedRoles={['PHARMACIST', 'ADMIN']} redirectTo="/">
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <main className="flex-1 flex overflow-hidden min-w-0">
            {/* Left: Live orders list */}
            <div className="w-80 flex-shrink-0 border-r border-slate-800/50 overflow-hidden">
              {feedError ? (
                <div className="px-3 py-2 text-xs text-rose-300 border-b border-rose-500/30 bg-rose-500/10">
                  {feedError}
                </div>
              ) : null}
              <LiveOrderFeed
                orders={orders}
                selectedOrderId={selectedOrder?.id}
                onSelectOrder={(order) => setSelectedOrder(order)}
              />
            </div>

            {/* Right: Dispensing workspace */}
            <div className="flex-1 overflow-hidden">
              {selectedOrder ? (
                <DispensingDashboard
                  order={selectedOrder}
                  onDispensed={handleOrderComplete}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    {loadingOrders ? (
                      <p className="text-sm text-cyan-300 mb-2">Loading pharmacy orders...</p>
                    ) : null}
                    <div className="text-6xl mb-4 opacity-20">💊</div>
                    <p className="text-lg text-slate-300 font-medium">
                      Select a Visit to Dispense Medications
                    </p>
                    <p className="text-sm text-slate-500 mt-2">
                      Select a patient from the live feed to start.
                    </p>
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

