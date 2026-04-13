'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { LogOut } from 'lucide-react'
import ThemeLanguageToggles from './ThemeLanguageToggles'

/**
 * Standardized footer for all sidebars: Theme/Lang toggles + Sign Out.
 * Used in Admin, Doctor, Emergency, and all other layouts.
 */
export default function SidebarFooter() {
  useAuth() // auth present for consistency; sign-out clears storage + redirects without calling logout to avoid ER auto-login
  const { t } = useLanguage()

  const handleSignOut = () => {
    // Clear session so login page sees no user. Do NOT call logout() here:
    // logout() sets user=null and triggers ER Doctor's useEffect which re-logs in; then we'd redirect with user set.
    if (typeof window !== 'undefined') {
      localStorage.removeItem('zionmed_user')
      document.cookie = 'zionmed_auth_token=; path=/; max-age=0'
      document.cookie = 'zionmed_user_role=; path=/; max-age=0'
    }
    // Hard redirect immediately; new page load will read empty storage and show login
    window.location.replace('/')
  }

  return (
    <div className="flex-shrink-0 flex flex-col border-t border-slate-800/50 mt-auto">
      <div className="px-3 py-3">
        <ThemeLanguageToggles compact />
      </div>
      <div className="px-3 pb-4 pt-1">
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-all border border-slate-700/50 hover:border-red-500/30"
        >
          <LogOut size={16} />
          <span>{t('auth.signOut')}</span>
        </button>
      </div>
    </div>
  )
}
