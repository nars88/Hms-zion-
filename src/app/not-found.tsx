'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Building2, Home, ArrowLeft, LayoutDashboard } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const isAdminPath = pathname.startsWith('/admin')
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 md:p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-xl bg-cyan-500/20 flex items-center justify-center mx-auto mb-6">
          <Building2 size={32} className="text-cyan-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-slate-400 text-sm mb-8">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-medium hover:bg-cyan-500/30 transition-colors"
          >
            <Home size={18} />
            Home
          </Link>
          {isAdminPath && (
            <Link
              href="/admin"
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-medium hover:bg-slate-700/50 transition-colors"
            >
              <LayoutDashboard size={18} />
              Admin
            </Link>
          )}
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-medium hover:bg-slate-700/50 transition-colors"
          >
            <ArrowLeft size={18} />
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}
