'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid } from 'lucide-react'
import ZionMedLogo from '@/components/ZionMedLogo'
import SidebarFooter from '@/components/shared/SidebarFooter'
import { useAuth } from '@/contexts/AuthContext'

const ER_DOCTOR_ITEMS = [
  { href: '/er/clinic', label: 'Clinical Hub', Icon: LayoutGrid },
] as const

/** ER specialist: single clinic entry only (no vitals station, no mobile tasks). */
export default function ERRoleSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const activeHref = useMemo(() => {
    return ER_DOCTOR_ITEMS.reduce<string | null>((bestHref, it) => {
      const b = it.href.split('?')[0].split('#')[0]
      const match = pathname === b || pathname.startsWith(b + '/')
      if (!match) return bestHref
      if (!bestHref) return it.href
      const bestBase = bestHref.split('?')[0].split('#')[0]
      return b.length > bestBase.length ? it.href : bestHref
    }, null)
  }, [pathname])

  if (!user) return null

  return (
    <aside className="w-64 glass border-r border-slate-800/50 flex flex-col" dir="ltr">
      <div className="p-6 border-b border-slate-800/50">
        <ZionMedLogo size="md" showText={true} />
        <p className="text-xs mt-2.5 ml-1 font-medium text-cyan-400">
          {isAdmin ? 'ER (Admin view)' : 'ER Doctor'}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {ER_DOCTOR_ITEMS.map((item) => {
          const base = item.href.split('?')[0].split('#')[0]
          const pathMatches = pathname === base || pathname.startsWith(base + '/')
          const isActive = pathMatches && activeHref === item.href
          const Icon = item.Icon
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
