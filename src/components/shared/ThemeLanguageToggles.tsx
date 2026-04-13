'use client'

import ThemeToggle from '@/components/shared/ThemeToggle'
import LanguageToggle from '@/components/shared/LanguageToggle'

/**
 * Theme + Language toggles in a single row (Settings Group).
 * Used in sidebars globally so the layout is consistent across ER, Clinic, Pharmacy, etc.
 * Responsive: stays in one row; min-w-0 prevents overflow on narrow sidebars.
 * @param compact - smaller padding for sidebar footer (no extra border)
 */
export default function ThemeLanguageToggles({ compact }: { compact?: boolean } = {}) {
  return (
    <div className={compact ? 'p-2' : 'p-4 border-t border-slate-800/50 dark:border-slate-800/50 border-slate-200'}>
      <div className="flex flex-row gap-2 items-stretch w-full min-w-0">
        <div className="flex-1 min-w-0 flex">
          <ThemeToggle />
        </div>
        <div className="flex-1 min-w-0 flex">
          <LanguageToggle />
        </div>
      </div>
    </div>
  )
}
