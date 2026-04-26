'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SidebarWrapper from '@/components/shared/SidebarWrapper'
import ZionMedLogo from '@/components/ZionMedLogo'
import MonthlyReportGenerator from '@/components/manager/MonthlyReportGenerator'
import KPICards from '@/components/manager/KPICards'
import DepartmentRevenueReport from '@/components/manager/DepartmentRevenueReport'
import InvoiceStatusAnalytics from '@/components/manager/InvoiceStatusAnalytics'
import { useAuth } from '@/contexts/AuthContext'

export default function ManagerDashboard() {
  const [reportGenerated, setReportGenerated] = useState(false)
  const { user } = useAuth()

  // STRICT ACCESS CONTROL: Only render if user is ADMIN
  if (!user || user.role !== 'ADMIN') {
    return null // Do not render in DOM for non-Admin users
  }

  return (
    <ProtectedRoute allowedRoles={['ADMIN']} redirectTo="/">
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SidebarWrapper />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Generate Monthly Report Button */}
              <MonthlyReportGenerator onReportGenerated={() => setReportGenerated(true)} />

              {/* KPI Cards - Visual Summary */}
              <KPICards />

              {/* Categorized Reports */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DepartmentRevenueReport />
                <InvoiceStatusAnalytics />
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}

