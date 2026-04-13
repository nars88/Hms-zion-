'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import ZionMedLogo from '@/components/ZionMedLogo'
import SidebarFooter from '@/components/shared/SidebarFooter'
import { LayoutDashboard } from 'lucide-react'
import { getDashboardHref } from '@/config/sidebarNav'
import { USER_ROLES } from '@/contexts/AuthContext'

export default function StaffSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  if (!user || user.role === USER_ROLES.ADMIN) return null

  const dashboardHref = getDashboardHref(user.role)

  return (
    <aside className="w-64 glass border-r border-slate-800/50 flex flex-col" dir="ltr">
      <div className="p-6 border-b border-slate-800/50">
        <ZionMedLogo size="md" showText={true} />
        <p className="text-xs mt-2.5 ml-1 font-medium text-slate-400">{user.role}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <Link
          href={dashboardHref}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
            pathname === dashboardHref || pathname.startsWith(dashboardHref.split('?')[0] + '/') || (dashboardHref.startsWith('/accountant') && pathname.startsWith('/accountant'))
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
              : 'text-slate-300 hover:bg-slate-800/30 hover:text-white'
          }`}
        >
          <LayoutDashboard size={18} />
          <span className="text-sm font-medium">Dashboard</span>
        </Link>
      </nav>

      <SidebarFooter />
    </aside>
  )
}
