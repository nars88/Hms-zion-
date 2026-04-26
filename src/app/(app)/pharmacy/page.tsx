'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'

export default function PharmacyDashboard() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/pharmacy/dispense')
  }, [router])

  return (
    <ProtectedRoute allowedRoles={['PHARMACIST', 'ADMIN']} redirectTo="/">
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex items-center justify-center text-slate-400">
          Redirecting to Orders Queue...
        </div>
      </div>
    </ProtectedRoute>
  )
}
