'use client'

import { Suspense } from 'react'
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
  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]} redirectTo="/">
      <div className="flex h-screen bg-slate-950 overflow-hidden min-h-0 [border:none]">
        <AdminContextSidebar />
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto [border:none]">
          <Suspense fallback={<AdminContentSkeleton />}>{children}</Suspense>
        </main>
      </div>
    </ProtectedRoute>
  )
}

function AdminContentSkeleton() {
  return (
    <div className="p-8">
      <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-800/70" />
      <div className="mt-6 h-12 w-full animate-pulse rounded-xl bg-slate-800/60" />
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="h-36 animate-pulse rounded-xl bg-slate-800/60" />
        <div className="h-36 animate-pulse rounded-xl bg-slate-800/60" />
      </div>
    </div>
  )
}
