'use client'

import { usePathname } from 'next/navigation'
import AdminContextSidebar from '@/components/admin/AdminContextSidebar'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import { USER_ROLES } from '@/contexts/AuthContext'

/**
 * Single layout for all /admin routes. Context-aware sidebar only.
 * Key by pathname so sidebar always reflects current route (no stale cache).
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]} redirectTo="/">
      <div className="flex h-screen bg-slate-950 overflow-hidden min-h-0 [border:none]">
        <AdminContextSidebar key={pathname} />
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto [border:none]">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}
