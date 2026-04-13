'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import LiveOrderFeed, { mockOrders } from '@/components/pharmacy/LiveOrderFeed'
import DispensingDashboard from '@/components/pharmacy/DispensingDashboard'
import BackButton from '@/components/BackButton'

export default function PharmacyDispensePage() {
  const [orders, setOrders] = useState(mockOrders)
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)

  // Remove patient from active queue and reset detail view (Dispense or Patient Declined / End Visit).
  const handleOrderComplete = () => {
    const currentOrderId = selectedOrder?.id
    setSelectedOrder(null)
    if (currentOrderId != null) {
      setOrders((prev) => prev.filter((order) => order.id !== currentOrderId))
    }
  }

  return (
    <ProtectedRoute allowedRoles={['PHARMACIST', 'ADMIN']} redirectTo="/">
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <main className="flex-1 flex overflow-hidden min-w-0">
            {/* Left: Live orders list */}
            <div className="w-80 flex-shrink-0 border-r border-slate-800/50 overflow-hidden">
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

