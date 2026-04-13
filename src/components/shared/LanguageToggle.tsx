'use client'

import { Languages } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function LanguageToggle() {
  const { language, setLanguage, isRTL } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en')
  }

  return (
    <button
      onClick={toggleLanguage}
      className="relative w-full h-full min-h-[2.5rem] px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-all flex items-center justify-center gap-1.5 group dark:bg-slate-800/50 dark:border-slate-700/50 dark:hover:bg-slate-700/50 bg-white border-slate-200 hover:bg-slate-50"
      title={language === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية'}
    >
      <Languages size={18} className="text-cyan-400 group-hover:text-cyan-300 transition-colors" />
      <span className="text-sm font-medium text-primary truncate min-w-0">
        {language === 'en' ? 'EN' : 'AR'}
      </span>
      <span className="text-xs text-secondary shrink-0">
        {language === 'en' ? 'AR' : 'EN'}
      </span>
    </button>
  )
}

