'use client'

import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import ZionMedLogo from '@/components/ZionMedLogo'
import TransactionHistory from '@/components/cashier/TransactionHistory'
import { USER_ROLES } from '@/contexts/AuthContext'
import { useAuth } from '@/contexts/AuthContext'
import { History, DollarSign } from 'lucide-react'

export default function TransactionHistoryPage() {
  const { user } = useAuth()

  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.ACCOUNTANT, USER_ROLES.ADMIN]}>
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-8">
            <TransactionHistory />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}

