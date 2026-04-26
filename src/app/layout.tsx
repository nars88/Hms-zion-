import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PageLoader from '@/components/shared/PageLoader'

// Self-hosted, preloaded, non-render-blocking. Replaces the previous
// `@import url('https://fonts.googleapis.com/...')` in globals.css which was
// a synchronous, render-blocking network round-trip on every first paint.
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Zion Med - Hospital Management System',
  description: 'Premium modern medical facility management system',
}

// Runs before React hydrates. Reads the saved theme and sets the class on
// <html> so the correct palette paints on first frame (no flash) while still
// letting ThemeContext (inside `(app)/layout.tsx`) switch the theme at runtime.
// Defaults to 'dark' when nothing is stored yet.
const THEME_INIT_SCRIPT = `(function(){try{var s=localStorage.getItem('zionmed_theme');var t=(s==='light'||s==='dark')?s:'dark';var r=document.documentElement;r.classList.remove('light','dark');r.classList.add(t);r.style.colorScheme=t;}catch(e){document.documentElement.classList.add('dark');}})();`

// Root layout: keeps only <html>, <body>, and the theme init. Providers
// (Auth, Theme, Language, VisitData, ...) live in `src/app/(app)/layout.tsx`
// so public pages (e.g. the marketing landing) render instantly without
// downloading or mounting 14 context providers they never use.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-[#020b18] text-primary">
        <PageLoader />
        {children}
      </body>
    </html>
  )
}
