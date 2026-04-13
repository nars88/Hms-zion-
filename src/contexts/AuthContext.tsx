'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

// Role Constants - Core Security Definitions
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  DOCTOR: 'DOCTOR',

  // Front desk & coordination
  RECEPTION: 'RECEPTION',
  RECEPTIONIST: 'RECEPTIONIST',
  INTAKE_NURSE: 'INTAKE_NURSE',
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
  // In production, get user from session/localStorage/API
  const [user, setUser] = useState<User | null>(() => {
    // Read from localStorage if available (from login)
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('zionmed_user')
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser) as User
        // middleware.ts uses cookies to decide auth; if cookies are missing we consider the
        // stored user stale and force a clean login UI (prevents infinite redirect loops).
        const hasAuthTokenCookie = document.cookie.includes('zionmed_auth_token=')
        const hasUserRoleCookie = document.cookie.includes('zionmed_user_role=')
        if (!hasAuthTokenCookie || !hasUserRoleCookie) {
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
      // Set cookies for middleware
      document.cookie = `zionmed_auth_token=${userData.id}; path=/; max-age=86400` // 24 hours
      document.cookie = `zionmed_user_role=${userData.role}; path=/; max-age=86400`
    }
  }

  const logout = () => {
    setUser(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zionmed_user')
      // Clear cookies
      document.cookie = 'zionmed_auth_token=; path=/; max-age=0'
      document.cookie = 'zionmed_user_role=; path=/; max-age=0'
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
    case 'RECEPTION':
      return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
    case 'PHARMACIST':
      return 'text-rose-400 bg-rose-500/10 border-rose-500/20'
    case 'ACCOUNTANT':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20'
    case 'INTAKE_NURSE':
      return 'text-teal-300 bg-teal-500/10 border-teal-500/20'
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
    case 'RECEPTION':
      return 'text-cyan-400'
    case 'PHARMACIST':
      return 'text-rose-400'
    case 'ACCOUNTANT':
      return 'text-blue-400'
    case 'INTAKE_NURSE':
      return 'text-teal-300'
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

