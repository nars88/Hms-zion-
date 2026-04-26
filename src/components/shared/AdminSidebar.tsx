'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import ZionMedLogo from '@/components/ZionMedLogo'
import SidebarFooter from '@/components/shared/SidebarFooter'
import { LayoutDashboard, Building2, FileText, Settings } from 'lucide-react'
import {
  ADMIN_DASHBOARD_HREF,
  ADMIN_DEPARTMENTS_HREF,
  ADMIN_REPORTS_HREF,
  ADMIN_SETTINGS_HREF,
} from '@/config/sidebarNav'
import { USER_ROLES } from '@/contexts/AuthContext'

export default function AdminSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user } = useAuth()

  if (!user || user.role !== USER_ROLES.ADMIN) return null

  const section = searchParams.get('section')
  const isAdminPage = pathname === '/admin'
  const linkActive = (href: string) => {
    if (!isAdminPage) return false
    const q = href.includes('section=') ? href.split('section=')[1]?.split('&')[0] : null
    if (q) return section === q
    return !section || section === 'dashboard'
  }

  return (
    <aside className="w-64 glass border-r border-slate-800/50 flex flex-col" dir="ltr">
      <div className="p-6 border-b border-slate-800/50">
        <ZionMedLogo size="md" showText={true} />
        <p className="text-xs mt-2.5 ml-1 font-medium text-cyan-400">ADMIN</p>
      </div>

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <Link
          href={ADMIN_DASHBOARD_HREF}
          prefetch
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
            isAdminPage && (!section || section === 'dashboard')
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              : 'text-slate-300 hover:bg-slate-800/30 hover:text-white'
          }`}
        >
          <LayoutDashboard size={18} />
          <span className="text-sm font-medium">Dashboard</span>
        </Link>
        <Link
          href={ADMIN_DEPARTMENTS_HREF}
          prefetch
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
            linkActive(ADMIN_DEPARTMENTS_HREF)
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              : 'text-slate-300 hover:bg-slate-800/30 hover:text-white'
          }`}
        >
          <Building2 size={18} />
          <span className="text-sm font-medium">Departments</span>
        </Link>
        <Link
          href={ADMIN_REPORTS_HREF}
          prefetch
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
            linkActive(ADMIN_REPORTS_HREF)
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              : 'text-slate-300 hover:bg-slate-800/30 hover:text-white'
          }`}
        >
          <FileText size={18} />
          <span className="text-sm font-medium">Reports</span>
        </Link>
        <Link
          href={ADMIN_SETTINGS_HREF}
          prefetch
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
            linkActive(ADMIN_SETTINGS_HREF)
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              : 'text-slate-300 hover:bg-slate-800/30 hover:text-white'
          }`}
        >
          <Settings size={18} />
          <span className="text-sm font-medium">Settings</span>
        </Link>
      </nav>

      <SidebarFooter />
    </aside>
  )
}
