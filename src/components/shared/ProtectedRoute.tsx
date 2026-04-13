'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, UserRole } from '@/contexts/AuthContext'
import { AlertCircle } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
  redirectTo?: string
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/',
}: ProtectedRouteProps) {
  const { user, hasAnyRole } = useAuth()
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(true)
  const didRedirectRef = useRef(false)

  useEffect(() => {
    // Check authentication first
    if (!user) {
      // Prevent navigation flooding/throttling if auth is stuck as null.
      if (didRedirectRef.current) {
        setIsChecking(false)
        return
      }
      didRedirectRef.current = true

      // Store the attempted URL for redirect after login
      const currentPath = window.location.pathname
      if (currentPath !== '/') {
        sessionStorage.setItem('redirectAfterLogin', currentPath)
      }
      router.replace('/')
      setIsChecking(false)
      return
    }

    // ADMIN OVERRIDE: Check if admin is accessing with override flag
    const adminOverride = typeof window !== 'undefined' ? sessionStorage.getItem('adminOverride') : null
    const isAdminOverride = adminOverride === 'true' && user.role === 'ADMIN'

    // Check role authorization (allow if admin override is active)
    if (!hasAnyRole(allowedRoles) && !isAdminOverride) {
      // Redirect to appropriate dashboard based on user role
      router.replace(redirectTo)
      return
    }

    setIsChecking(false)
  }, [user, allowedRoles, hasAnyRole, router, redirectTo])

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B1120]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  // ADMIN OVERRIDE: Allow access if admin override is active
  const adminOverride = typeof window !== 'undefined' ? sessionStorage.getItem('adminOverride') : null
  const isAdminOverride = adminOverride === 'true' && user?.role === 'ADMIN'

  if (!hasAnyRole(allowedRoles) && !isAdminOverride) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0B1120]">
        <div className="glass rounded-xl border border-rose-500/30 p-8 max-w-md text-center relative overflow-hidden">
          {/* High-tech background effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-rose-400 to-transparent"></div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center">
              <AlertCircle size={40} className="text-rose-400 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-primary mb-3">Access Denied</h2>
            <p className="text-sm text-secondary mb-2 font-medium">
              Authorized Personnel Only
            </p>
            <div className="h-px w-24 bg-slate-700 mx-auto mb-6"></div>
            <p className="text-xs text-slate-400 mb-2">
              Required Role: <span className="text-rose-400 font-semibold">{allowedRoles.join(' or ')}</span>
            </p>
            <p className="text-xs text-slate-500 mb-6">
              Your Role: <span className="text-secondary">{user.role}</span>
            </p>
            <button
              onClick={() => router.push(redirectTo)}
              className="px-6 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm font-medium text-primary hover:bg-slate-700/50 hover:border-slate-600/50 transition-all"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

