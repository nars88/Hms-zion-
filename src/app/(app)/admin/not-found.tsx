import Link from 'next/link'
import { Building2, LayoutDashboard } from 'lucide-react'

export default function AdminNotFound() {
  return (
    <div className="min-h-full bg-slate-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 md:p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-xl bg-cyan-500/20 flex items-center justify-center mx-auto mb-6">
          <Building2 size={32} className="text-cyan-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-slate-400 text-sm mb-8">
          This admin page doesn’t exist. Return to the dashboard or departments.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-medium hover:bg-cyan-500/30 transition-colors w-full"
        >
          <LayoutDashboard size={18} />
          Admin
        </Link>
      </div>
    </div>
  )
}
