'use client'

import { Lock } from 'lucide-react'

/**
 * Shown when ADMIN / ACCOUNTANT must not view clinical content (reception / shared modals).
 */
export default function RestrictedClinicalView({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-lg bg-slate-200/25 dark:bg-slate-500/15 border border-slate-300/50 dark:border-slate-500/40 px-4 py-4 flex flex-col items-center text-center gap-2.5 ${className}`.trim()}
    >
      <Lock className="w-7 h-7 text-slate-500 dark:text-slate-400 shrink-0" aria-hidden />
      <p className="text-sm text-slate-600 dark:text-slate-200 leading-snug max-w-md">
        Clinical data is restricted for your role to ensure patient privacy (HIPAA/Standard Compliance).
      </p>
    </div>
  )
}
