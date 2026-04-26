'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import ZionMedLogo from '@/components/ZionMedLogo'
import LivePaymentFeed from '@/components/cashier/LivePaymentFeed'
import PaymentProcessor from '@/components/cashier/PaymentProcessor'
import { USER_ROLES } from '@/contexts/AuthContext'
import { useAuth } from '@/contexts/AuthContext'

export default function CashierDashboard() {
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const { user } = useAuth()

  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.ACCOUNTANT, USER_ROLES.ADMIN]}>
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main Content - Split Screen */}
          <main className="flex-1 flex overflow-hidden">
            {/* Left Side: Live Payment Feed */}
            <div className="w-96 flex-shrink-0 border-r border-slate-800/50 overflow-y-auto">
              <LivePaymentFeed
                selectedPatientId={selectedPatient?.id}
                onSelectPatient={setSelectedPatient}
              />
            </div>

            {/* Right Side: Payment Processor */}
            <div className="flex-1 overflow-hidden">
              <PaymentProcessor
                patient={selectedPatient}
                onPaymentComplete={() => {
                  setSelectedPatient(null)
                  // Refresh the feed
                  window.location.reload()
                }}
              />
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}

