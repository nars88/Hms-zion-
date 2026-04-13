'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, USER_ROLES } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import ZionMedLogo from '@/components/ZionMedLogo'
import LanguageToggle from '@/components/shared/LanguageToggle'
import { LogIn, Lock, Mail, AlertCircle } from 'lucide-react'

// CRITICAL: Role-based redirect map - Check role_tag FIRST
const REDIRECT_MAP: Record<string, string> = {
  [USER_ROLES.ADMIN]: '/admin/dashboard', // FIXED: Admin goes to /admin/dashboard
  [USER_ROLES.ACCOUNTANT]: '/accountant?view=all',
  [USER_ROLES.DOCTOR]: '/doctor/queue',
  [USER_ROLES.PHARMACIST]: '/pharmacy/dispense',
  [USER_ROLES.RECEPTIONIST]: '/reception',
  [USER_ROLES.INTAKE_NURSE]: '/intake',
  [USER_ROLES.ER_NURSE]: '/emergency/nurse',
  [USER_ROLES.SECRETARY]: '/doctor/queue',
  [USER_ROLES.LAB_TECH]: '/lab',
  [USER_ROLES.RADIOLOGY_TECH]: '/radiology',
  [USER_ROLES.SECURITY]: '/gatekeeper',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  // Avoid getting stuck on a global "Loading..." screen if auth hydration stalls.
  // The real auth/redirect logic still runs in the effect below.
  // IMPORTANT: keep server/client initial UI identical to avoid hydration errors.
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const { login, user } = useAuth()
  const { t, isRTL } = useLanguage()
  const router = useRouter()

  // Check authentication status on mount (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Stop the loading UI as soon as the component is mounted on the client
    setIsCheckingAuth(false)

    // If user is already logged in, redirect them
    if (user) {
      // CRITICAL: Check role_tag FIRST before redirecting
      const redirectPath = sessionStorage.getItem('redirectAfterLogin')
      if (redirectPath) {
        sessionStorage.removeItem('redirectAfterLogin')
        router.replace(redirectPath)
      } else {
        // Role-based redirect: LAB_TECH → /lab, RADIOLOGY_TECH → /radiology, etc.
        const userEmail = (user.email || '').toLowerCase()
        const defaultPath =
          userEmail === 'doctor@zion.med'
            ? '/emergency/doctor'
            : userEmail === 'nurse@zion.med'
              ? '/emergency/nurse'
              : userEmail === 'pharmacy@zion.med'
                ? '/pharmacy/dispense'
                : REDIRECT_MAP[user.role] || '/admin/dashboard'
        router.replace(defaultPath)
      }
    }
  }, [user, router])

  // Show loading while checking auth state (prevents hydration mismatch)
  if (isCheckingAuth) {
    return (
      <div className="h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-[#0B1120] via-[#1E293B] to-[#0F172A] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show redirecting only after auth check is complete and user exists
  if (user) {
    return (
      <div className="h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-gradient-to-br from-[#0B1120] via-[#1E293B] to-[#0F172A] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-slate-400">Redirecting...</p>
        </div>
      </div>
    )
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Call authentication API
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Invalid email or password')
      }

      const userData = data?.user
      if (!userData || !userData.id || userData.role == null) {
        throw new Error('Invalid user data. Please contact administrator.')
      }

      const role = String(userData.role)
      if (!Object.values(USER_ROLES).includes(role as any)) {
        throw new Error('Invalid user role. Please contact administrator.')
      }

      login({
        id: userData.id,
        name: userData.name ?? 'User',
        email: userData.email ?? '',
        role: role as any,
      })

      const userEmail = (userData.email || '').toLowerCase()
      const redirectPath = typeof window !== 'undefined' ? sessionStorage.getItem('redirectAfterLogin') : null
      if (redirectPath) {
        if (typeof window !== 'undefined') sessionStorage.removeItem('redirectAfterLogin')
        router.replace(redirectPath)
      } else {
        let defaultPath = '/admin/dashboard'
        if (userEmail === 'doctor@zion.med') {
          defaultPath = '/emergency/doctor'
        } else if (userEmail === 'nurse@zion.med') {
          defaultPath = '/emergency/nurse'
        } else if (userEmail === 'pharmacy@zion.med') {
          defaultPath = '/pharmacy/dispense'
        } else if (role === USER_ROLES.LAB_TECH) {
          defaultPath = '/lab'
        } else if (role === USER_ROLES.RADIOLOGY_TECH) {
          defaultPath = '/radiology'
        } else {
          defaultPath = REDIRECT_MAP[role as keyof typeof REDIRECT_MAP] || '/admin/dashboard'
        }
        router.replace(defaultPath)
      }
    } catch (err: any) {
      console.error('❌ Login failed:', err)
      setError(err?.message || 'Invalid email or password. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <div className="relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden overscroll-none bg-gradient-to-br from-[#0B1120] via-[#1E293B] to-[#0F172A] flex flex-col items-center justify-center px-4 sm:px-6">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(6,182,212,0.3) 1px, transparent 0)`,
            backgroundSize: '50px 50px',
          }}
        ></div>
      </div>

      {/* Language Toggle - Top Right */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle />
      </div>

      {/* Centered Login Card — fixed viewport, no page scroll */}
      <div className="relative z-10 flex w-full max-w-md max-h-full min-h-0 flex-col justify-center">
        {/* Professional Login Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 sm:p-8 md:p-10 shadow-2xl shadow-black/50">
          {/* ZION Med Logo and Hospital Name */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <ZionMedLogo size="lg" showText={true} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
              Hospital Management System
            </h1>
            <p className="text-sm text-slate-400">
              Secure access to your dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div
                  className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 z-10`}
                >
                  <Mail
                    size={18}
                    className="text-cyan-400 drop-shadow-[0_0_4px_rgba(6,182,212,0.5)]"
                  />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-slate-800/70 border border-slate-700/70 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all`}
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <div
                  className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 z-10`}
                >
                  <Lock
                    size={18}
                    className="text-cyan-400 drop-shadow-[0_0_4px_rgba(6,182,212,0.5)]"
                  />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 bg-slate-800/70 border border-slate-700/70 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all`}
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-2">
                <AlertCircle size={18} className="text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-rose-400 flex-1">{error}</p>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-cyan-500 text-white rounded-lg text-base font-semibold hover:bg-cyan-600 active:bg-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            🔒 Secure access to ZION Hospital Management System
          </p>
          <p className="text-[10px] text-slate-600 mt-1">
            Authorized personnel only. All access is logged and monitored.
          </p>
        </div>
      </div>
    </div>
  )
}
