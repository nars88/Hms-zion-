'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import ZionMedLogo from '@/components/ZionMedLogo'
import SidebarFooter from '@/components/shared/SidebarFooter'
import { LayoutDashboard, FolderArchive, Stethoscope } from 'lucide-react'
import {
  getDepartmentForPath,
  DEPARTMENT_NAV,
  getDashboardHref,
} from '@/config/sidebarNav'

export default function SmartSidebar() {
  const pathname = usePathname()
  // Treat /admin/<dept> as an admin-view of that department for mirroring
  const deptPath =
    pathname.startsWith('/admin/') ? pathname.replace('/admin', '') || '/' : pathname
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const deptKey = getDepartmentForPath(deptPath)
  const deptConfig = deptKey ? DEPARTMENT_NAV[deptKey] : null
  const navItems = useMemo(
    () =>
      deptConfig
        ? deptConfig.items
        : [{ href: getDashboardHref(user?.role || 'DOCTOR'), label: 'Dashboard' }],
    [deptConfig, user?.role]
  )
  const activeHref = useMemo(() => {
    return navItems.reduce<string | null>((bestHref, it) => {
      const b = it.href.split('?')[0].split('#')[0]
      const match = pathname === b || pathname.startsWith(b + '/')
      if (!match) return bestHref
      if (!bestHref) return it.href
      const bestBase = bestHref.split('?')[0].split('#')[0]
      return b.length > bestBase.length ? it.href : bestHref
    }, null)
  }, [navItems, pathname])

  if (!user) return null

  return (
    <aside className="w-64 glass border-r border-slate-800/50 flex flex-col" dir="ltr">
      <div className="p-6 border-b border-slate-800/50">
        <ZionMedLogo size="md" showText={true} />
        <p className="text-xs mt-2.5 ml-1 font-medium text-cyan-400">
          {isAdmin && deptConfig ? deptConfig.roleLabel : user.role}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {/* Only one item active: the one whose path matches current URL (longest match wins) */}
        {navItems.map((item) => {
          const base = item.href.split('?')[0].split('#')[0]
          const pathMatches = pathname === base || pathname.startsWith(base + '/')
          const isActive = pathMatches && activeHref === item.href
          const isArchive = item.href === '/accountant/archive'
          const isDoctor = item.href.startsWith('/doctor')
          const Icon = isArchive ? FolderArchive : isDoctor ? Stethoscope : LayoutDashboard
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-slate-300 hover:bg-slate-800/30 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <SidebarFooter />
    </aside>
  )
}
