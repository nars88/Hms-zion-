'use client'

import { type ElementType, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  FileText,
  Settings,
  Users,
  UserPlus,
  ClipboardList,
  Package,
  FileStack,
  ScrollText,
  Palette,
  FlaskConical,
  TestTube,
  ChevronDown,
} from 'lucide-react'
import SidebarFooter from '@/components/shared/SidebarFooter'
import { useBranding } from '@/contexts/BrandingContext'

export default function AdminContextSidebar() {
  const { systemName, logoUrl } = useBranding()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (pathname.startsWith('/admin/settings')) setSettingsOpen(true)
  }, [pathname])

  const isReception = pathname.includes('/admin/reception') || pathname === '/reception'
  const isPharmacy = pathname.includes('/admin/pharmacy') || pathname === '/pharmacy' || pathname.startsWith('/pharmacy/')
  const isLab = pathname.includes('/admin/lab') || pathname === '/lab' || pathname.startsWith('/lab/')
  const isMainAdmin =
    pathname === '/admin' ||
    pathname === '/admin/dashboard' ||
    pathname === '/admin/departments' ||
    pathname === '/admin/reports' ||
    pathname.startsWith('/admin/settings')

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-slate-950/80 backdrop-blur-md border-r border-slate-800 overflow-hidden" dir="ltr">
      {/* Header */}
      <div className="px-4 py-5 border-b border-slate-800 flex items-center gap-3 flex-shrink-0">
        <div className="h-9 w-9 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs font-bold tracking-tight text-cyan-300">
              {(systemName || 'Z').trim().charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="leading-tight min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-slate-500 truncate">{systemName}</p>
          <p className="text-sm font-semibold text-slate-100">Admin Control</p>
        </div>
      </div>

      <nav className="flex-1 py-5 px-4 overflow-y-auto">
        <div className="flex flex-col gap-4">
        {isReception && (
          <>
            <NavLink href="/admin/reception" pathname={pathname} icon={Users} label="Patients" searchParams={searchParams} />
            <NavLink href="/admin/reception?section=registration" pathname={pathname} icon={UserPlus} label="Registration" searchParams={searchParams} />
            <NavLink href="/admin/reception?section=triage" pathname={pathname} icon={ClipboardList} label="Triage" searchParams={searchParams} />
          </>
        )}

        {isPharmacy && (
          <>
            <NavLink href="/admin/pharmacy/inventory" pathname={pathname} icon={Package} label="Inventory" searchParams={searchParams} />
            <NavLink href="/admin/pharmacy" pathname={pathname} icon={FileStack} label="Prescriptions" searchParams={searchParams} />
          </>
        )}

        {isLab && (
          <>
            <NavLink href="/admin/lab" pathname={pathname} icon={FlaskConical} label="Requests" searchParams={searchParams} />
            <NavLink href="/admin/lab/results" pathname={pathname} icon={TestTube} label="Results" searchParams={searchParams} />
          </>
        )}

        {isMainAdmin && (
          <>
            <NavLink href="/admin/dashboard" pathname={pathname} icon={LayoutDashboard} label="Dashboard" searchParams={searchParams} />
            <NavLink href="/admin/departments" pathname={pathname} icon={Building2} label="Departments" searchParams={searchParams} />
            <NavLink href="/admin/reports" pathname={pathname} icon={FileText} label="Reports" searchParams={searchParams} />
            <button
              type="button"
              onClick={() => setSettingsOpen((prev) => !prev)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                pathname.startsWith('/admin/settings')
                  ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/50 shadow-[0_0_0_1px_rgba(6,182,212,0.35)]'
                  : 'bg-transparent text-slate-400 hover:bg-slate-800/80 hover:text-slate-50 border border-transparent'
              }`}
            >
              <span className="inline-flex items-center gap-3">
                <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800/60 text-slate-500">
                  <Settings size={18} />
                </span>
                <span className="font-medium">Settings</span>
              </span>
              <ChevronDown
                size={16}
                className={`transition-transform ${settingsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {settingsOpen ? (
              <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-slate-800 pl-3">
                <NavLink
                  href="/admin/settings"
                  pathname={pathname}
                  icon={Users}
                  label="Employee Management"
                  searchParams={searchParams}
                />
                <NavLink
                  href="/admin/settings/pricing"
                  pathname={pathname}
                  icon={FileStack}
                  label="Service & Price Control"
                  searchParams={searchParams}
                />
                <NavLink
                  href="/admin/settings/logs"
                  pathname={pathname}
                  icon={ScrollText}
                  label="Activity Logs"
                  searchParams={searchParams}
                />
                <NavLink
                  href="/admin/settings/branding"
                  pathname={pathname}
                  icon={Palette}
                  label="Branding & Identity"
                  searchParams={searchParams}
                />
              </div>
            ) : null}
          </>
        )}
        </div>
      </nav>

      {/* Footer: Theme/Lang + Sign Out */}
      <SidebarFooter />
    </aside>
  )
}

function NavLink({
  href,
  pathname,
  searchParams,
  icon: Icon,
  label,
}: {
  href: string
  pathname: string
  searchParams?: ReturnType<typeof useSearchParams>
  icon: ElementType
  label: string
}) {
  const base = href.split('?')[0].split('#')[0]
  const section = href.includes('section=') ? href.split('section=')[1]?.split('&')[0] : null

  let isActive: boolean
  if (section !== null && section !== undefined) {
    isActive = pathname === base && searchParams?.get('section') === section
  } else {
    // Exact pathname match only — prevents multiple sub-items from being active.
    isActive = pathname === base
  }

  return (
    <Link
      href={href}
      prefetch
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
        isActive
          ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/50 shadow-[0_0_0_1px_rgba(6,182,212,0.35)]'
          : 'bg-transparent text-slate-400 hover:bg-slate-800/80 hover:text-slate-50 border border-transparent'
      }`}
    >
      <span className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800/60 text-slate-500'}`}>
        <Icon size={18} />
      </span>
      <span className="font-medium">{label}</span>
    </Link>
  )
}
