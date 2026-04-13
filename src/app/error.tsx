'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.error('App error boundary:', error)
    }
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6 bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="max-w-md w-full rounded-xl border border-slate-700 bg-slate-900/50 p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-400 mb-4" />
        <h2 className="text-lg font-semibold text-slate-100 mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-400 mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-cyan-600 text-white font-medium hover:bg-cyan-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}
