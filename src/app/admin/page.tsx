'use client'

import {
  Building2,
  ClipboardList,
  Pill,
  Microscope,
  Receipt,
  Shield,
  BedDouble,
  ExternalLink,
} from 'lucide-react'

const DEPARTMENTS = [
  { id: 'reception', name: 'Reception', icon: ClipboardList, href: '/admin/reception', gradient: 'from-blue-500 to-cyan-600' },
  { id: 'pharmacy', name: 'Pharmacy', icon: Pill, href: '/admin/pharmacy', gradient: 'from-emerald-500 to-teal-600' },
  { id: 'laboratory', name: 'Laboratory', icon: Microscope, href: '/admin/lab', gradient: 'from-violet-500 to-purple-600' },
  { id: 'accountant', name: 'Accountant', icon: Receipt, href: '/accountant', gradient: 'from-amber-500 to-orange-600' },
  { id: 'gatekeeper', name: 'Gatekeeper', icon: Shield, href: '/gatekeeper', gradient: 'from-rose-500 to-red-600' },
  { id: 'inpatients', name: 'Inpatients', icon: BedDouble, href: '/intake', gradient: 'from-indigo-500 to-blue-600' },
]

export default function AdminPage() {
  const handleEnter = (href: string) => {
    sessionStorage.setItem('adminOverride', 'true')
    sessionStorage.setItem('adminReturnPath', '/admin')
    window.location.href = href
  }

  return (
    <div className="min-h-full bg-slate-950 relative">
      {/* Subtle radial glow top-right */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_0%,rgba(59,130,246,0.06)_0%,transparent_50%)]" aria-hidden />
      <div className="relative max-w-6xl mx-auto px-8 pb-8 pt-12 md:px-10 md:pt-12 md:pb-10">
        <header className="mb-8 pb-6 border-b border-slate-800/50 bg-slate-900/20 backdrop-blur-sm rounded-xl px-1 -mx-1">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Building2 size={28} className="text-cyan-400 flex-shrink-0" />
            <span className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Master Access Portal</span>
          </h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DEPARTMENTS.map((dept) => {
            const Icon = dept.icon
            return (
              <div
                key={dept.id}
                className="relative rounded-2xl bg-slate-900/40 border border-slate-800 p-6 flex flex-col min-h-[240px] hover:border-slate-700/60 hover:scale-[1.02] transition-all duration-200"
              >
                <div className="absolute top-4 right-4 px-2.5 py-1 bg-teal-500/20 border border-teal-500/40 rounded-lg">
                  <span className="text-xs font-medium text-teal-300">Admin Access</span>
                </div>

                <div className={`mb-4 w-16 h-16 rounded-xl bg-gradient-to-br ${dept.gradient} flex items-center justify-center shadow-lg flex-shrink-0`}>
                  <Icon size={32} className="text-white" strokeWidth={1.5} />
                </div>

                <h2 className="text-xl font-bold text-white mb-6 flex-1">
                  {dept.name}
                </h2>

                <button
                  type="button"
                  onClick={() => handleEnter(dept.href)}
                  className={`w-full py-3 rounded-xl bg-gradient-to-r ${dept.gradient} text-white font-semibold flex items-center justify-center gap-2 hover:opacity-95 transition-opacity shadow-md`}
                >
                  <ExternalLink size={18} />
                  Enter Department
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
