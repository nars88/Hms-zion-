'use client'

import { useAuth, getRoleColor } from '@/contexts/AuthContext'
import { LogOut, Shield } from 'lucide-react'

export default function UserProfile() {
  const { user, logout } = useAuth()

  if (!user) return null

  const roleColor = getRoleColor(user.role)

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="p-4 border-t border-slate-800/50 bg-slate-900/20">
      {/* User Profile Card */}
      <div className="glass rounded-xl border border-slate-800/50 p-4 mb-3">
        {/* Avatar with Glow Effect */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border-2 border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full" />
              ) : (
                <span className="text-base font-semibold text-primary">{getInitials(user.name)}</span>
              )}
            </div>
            {/* Online indicator */}
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 shadow-lg"></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary truncate">{user.name}</p>
            <p className="text-xs text-secondary truncate">{user.email}</p>
          </div>
        </div>

        {/* Glowing Role Badge */}
        <div className={`relative px-4 py-2.5 rounded-lg border text-xs font-semibold text-center ${roleColor} shadow-lg`}>
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
          <div className="relative flex items-center justify-center gap-2">
            <Shield size={12} />
            <span>
              {user.role === 'ACCOUNTANT' 
                ? 'FINANCE DEPT' 
                : user.role === 'ADMIN'
                ? 'SYSTEM ADMINISTRATION'
                : (user.roleTitle || user.role)}
            </span>
          </div>
        </div>
      </div>

      {/* Sign Out Button */}
      <button
        onClick={() => {
          logout()
          window.location.href = '/'
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium text-secondary hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all border border-slate-800/30 hover:border-rose-500/30"
      >
        <LogOut size={14} />
        <span>Sign Out</span>
      </button>
    </div>
  )
}

