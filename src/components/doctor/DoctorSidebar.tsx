'use client'

import type { ElementType } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ZionMedLogo from '@/components/ZionMedLogo'
import SidebarFooter from '@/components/shared/SidebarFooter'
import { useBranding } from '@/contexts/BrandingContext'
import { ListOrdered, Calendar, Stethoscope } from 'lucide-react'

const NAV_ITEMS: { view: string; label: string; icon: ElementType }[] = [
  { view: 'queue', label: 'Queue', icon: ListOrdered },
  { view: 'schedule', label: 'Schedule', icon: Calendar },
]

export default function DoctorSidebar() {
  const pathname = usePathname()
  const { systemName } = useBranding()

  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col h-full max-h-screen min-h-0 bg-[#0B1120] border-r border-slate-800/50"
      dir="ltr"
    >
      <div className="flex-shrink-0 p-4 py-5 border-b border-slate-800/50">
        <ZionMedLogo size="md" showText={true} />
        <div className="flex items-center gap-3 mt-3 ml-1">
          <div className="h-9 w-9 rounded-xl bg-cyan-500/20 flex items-center justify-center">
            <Stethoscope size={18} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-slate-500">Clinic</p>
            <p className="text-sm font-semibold text-slate-100">Doctor</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 py-4 px-3 flex flex-col gap-3 overflow-y-auto min-h-0">
        {NAV_ITEMS.map((item) => {
          const href = item.view === 'queue' ? '/doctor/queue' : `/doctor/schedule`
          const isActive =
            item.view === 'queue'
              ? pathname === '/doctor/queue' || pathname === '/doctor'
              : pathname === '/doctor/schedule' || pathname.startsWith('/doctor/schedule/')
          const Icon = item.icon
          return (
            <Link
              key={item.view}
              href={href}
              prefetch
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                isActive
                  ? 'bg-cyan-500/15 text-cyan-200 border-cyan-500/30'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-50 border-transparent'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="flex-shrink-0 border-t border-slate-800/50 flex flex-col">
        <p className="text-[11px] text-slate-500 px-4 pt-3 pb-1 truncate" title={systemName}>
          {systemName}
        </p>
        <SidebarFooter />
      </div>
    </aside>
  )
}
