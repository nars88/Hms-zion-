'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'

export default function ThemeToggle() {
  const { theme, toggleTheme, isDark } = useTheme()
  const { t } = useLanguage()

  return (
    <button
      onClick={toggleTheme}
      className="relative w-full h-full min-h-[2.5rem] px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-all flex items-center justify-center gap-1.5 group dark:bg-slate-800/50 dark:border-slate-700/50 dark:hover:bg-slate-700/50 bg-white border-slate-200 hover:bg-slate-50"
      title={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
    >
      {isDark ? (
        <Moon size={18} className="text-cyan-400 group-hover:text-cyan-300 transition-colors dark:text-cyan-400 dark:group-hover:text-cyan-300" />
      ) : (
        <Sun size={18} className="text-amber-500 group-hover:text-amber-600 transition-colors" />
      )}
      <span className="text-sm font-medium dark:text-primary text-slate-900 truncate min-w-0">
        {isDark ? t('theme.dark') : t('theme.light')}
      </span>
    </button>
  )
}

