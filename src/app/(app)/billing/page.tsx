'use client'

import { useState, useEffect } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import ZionMedLogo from '@/components/ZionMedLogo'
import PendingBillsList from '@/components/billing/PendingBillsList'
import InvoiceGenerator from '@/components/billing/InvoiceGenerator'
import { USER_ROLES } from '@/contexts/AuthContext'
import { useAuth } from '@/contexts/AuthContext'
import { DollarSign } from 'lucide-react'

export default function BillingPage() {
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const { user } = useAuth()

  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.RECEPTIONIST]}>
      <div className="flex h-screen bg-primary text-primary overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main Content - Split Screen */}
          <main className="flex-1 flex overflow-hidden">
            {/* Left Side: Pending Bills List */}
            <div className="w-96 flex-shrink-0 border-r border-slate-800/50 overflow-y-auto">
              <PendingBillsList
                selectedPatientId={selectedPatient?.id}
                onSelectPatient={setSelectedPatient}
              />
            </div>

            {/* Right Side: Invoice Generator */}
            <div className="flex-1 overflow-y-auto">
              <InvoiceGenerator
                patient={selectedPatient}
                onPaymentComplete={() => {
                  setSelectedPatient(null)
                  // Refresh the list
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

