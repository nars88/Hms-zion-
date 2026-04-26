'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

// Role Constants - Core Security Definitions
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  DOCTOR: 'DOCTOR',

  // Front desk & coordination
  RECEPTION: 'RECEPTIONIST', // alias for legacy compatibility
  RECEPTIONIST: 'RECEPTIONIST',
  INTAKE_NURSE: 'INTAKE_NURSE',
  /** ER vitals-room terminal only (not general intake / reception) */
  ER_INTAKE_NURSE: 'ER_INTAKE_NURSE',
  ER_NURSE: 'ER_NURSE',
  SECRETARY: 'SECRETARY',

  // Pharmacy & billing
  PHARMACIST: 'PHARMACIST',
  ACCOUNTANT: 'ACCOUNTANT',

  // Security / infrastructure
  SECURITY: 'SECURITY',

  // Diagnostics
  LAB_TECH: 'LAB_TECH',
  RADIOLOGY_TECH: 'RADIOLOGY_TECH',
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  roleTitle?: string // e.g., "Head Surgeon", "Senior Pharmacist"
  avatar?: string
}

interface AuthContextType {
  user: User | null
  login: (user: User) => void
  logout: () => void
  hasRole: (role: UserRole | UserRole[]) => boolean
  hasAnyRole: (roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const getCookieValue = (name: string): string | null => {
    if (typeof document === 'undefined') return null
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
    return match ? decodeURIComponent(match[1]) : null
  }

  // In production, get user from session/localStorage/API
  const [user, setUser] = useState<User | null>(() => {
    // Read from localStorage if available (from login)
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('zionmed_user')
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser) as User
        // The signed JWT is now httpOnly (JS cannot see it). We rely on the
        // JS-readable role cookie as a presence signal — if it was cleared
        // (by logout, expired session, or middleware wipe) we also discard
        // the cached user to keep the UI in sync with the server.
        const hasUserRoleCookie = document.cookie.includes('zionmed_user_role=')
        if (!hasUserRoleCookie) {
          localStorage.removeItem('zionmed_user')
          return null
        }
        const cookieRole = getCookieValue('zionmed_user_role')
        if (cookieRole && cookieRole !== parsedUser.role) {
          // Prevent cross-role overlap after account switches/partial refreshes.
          // Force clean login instead of silently landing on wrong dashboard.
          localStorage.removeItem('zionmed_user')
          return null
        }
        return parsedUser
      }
    }
    // No default user - must login
    return null
  })

  const login = (userData: User) => {
    setUser(userData)
    if (typeof window !== 'undefined') {
      localStorage.setItem('zionmed_user', JSON.stringify(userData))
      // Note: zionmed_auth_token is now set server-side as httpOnly by the
      // /api/auth/login response. We only mirror the role cookie here as a
      // safety net in case the browser dropped the Set-Cookie (non-HTTPS
      // quirks, iframes, etc.) — this cookie is UI-only and never trusted.
      document.cookie = `zionmed_user_role=${userData.role}; path=/; max-age=86400`
    }
  }

  const logout = () => {
    setUser(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zionmed_user')
      // Clear the JS-readable role cookie client-side for instant UI update.
      document.cookie = 'zionmed_user_role=; path=/; max-age=0'
      // httpOnly auth token can only be cleared via Set-Cookie from the server.
      fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    }
  }

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!user) return false
    if (Array.isArray(role)) {
      return role.includes(user.role)
    }
    return user.role === role
  }

  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!user) return false
    return roles.includes(user.role)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, hasRole, hasAnyRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Helper function to get role color
export function getRoleColor(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'text-purple-400 bg-purple-500/10 border-purple-500/20'
    case 'DOCTOR':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    case 'RECEPTIONIST':
      return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
    case 'PHARMACIST':
      return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
    case 'ACCOUNTANT':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    case 'INTAKE_NURSE':
      return 'text-teal-300 bg-teal-500/10 border-teal-500/20'
    case 'ER_INTAKE_NURSE':
      return 'text-emerald-300 bg-emerald-600/15 border-emerald-500/25'
    case 'ER_NURSE':
      return 'text-red-300 bg-red-500/10 border-red-500/20'
    case 'SECRETARY':
      return 'text-amber-300 bg-amber-500/10 border-amber-500/20'
    case 'SECURITY':
      return 'text-slate-300 bg-slate-700/60 border-slate-500/50'
    case 'LAB_TECH':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    case 'RADIOLOGY_TECH':
      return 'text-sky-400 bg-sky-500/10 border-sky-500/20'
    default:
      return 'text-slate-400 bg-slate-800/50 border-slate-700/50'
  }
}

// Helper function to get role icon color
export function getRoleIconColor(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'text-purple-400'
    case 'DOCTOR':
      return 'text-emerald-400'
    case 'RECEPTIONIST':
      return 'text-cyan-400'
    case 'PHARMACIST':
      return 'text-rose-400'
    case 'ACCOUNTANT':
      return 'text-blue-400'
    case 'INTAKE_NURSE':
      return 'text-teal-300'
    case 'ER_INTAKE_NURSE':
      return 'text-emerald-300'
    case 'ER_NURSE':
      return 'text-red-300'
    case 'SECRETARY':
      return 'text-amber-300'
    case 'SECURITY':
      return 'text-slate-300'
    case 'LAB_TECH':
      return 'text-amber-400'
    case 'RADIOLOGY_TECH':
      return 'text-sky-400'
    default:
      return 'text-slate-400'
  }
}

