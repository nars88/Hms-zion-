'use client'

import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import PharmacyManagerDashboard from '@/components/pharmacy/PharmacyManagerDashboard'
import QRSearchBar from '@/components/shared/QRSearchBar'
import BackButton from '@/components/BackButton'

export default function PharmacyManagerPage() {
  return (
    <ProtectedRoute allowedRoles={['PHARMACIST', 'ADMIN']} redirectTo="/">
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="p-4 border-b border-slate-800/50 bg-slate-900/30 flex-shrink-0">
            <QRSearchBar placeholder="Search Patient or Scan QR Code" onSearch={() => {}} />
          </div>
          <main className="flex-1 overflow-hidden min-w-0">
            <PharmacyManagerDashboard />
          </main>
        </div>
      </div>
      <BackButton />
    </ProtectedRoute>
  )
}
