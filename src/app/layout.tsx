import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import PageLoader from '@/components/shared/PageLoader'
import { BrandingProvider } from '@/contexts/BrandingContext'

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" dir="ltr" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body className={`${inter.variable} bg-[var(--bg-primary)] text-[var(--text-primary)]`}>
        <PageLoader />
        <BrandingProvider>{children}</BrandingProvider>
      </body>
    </html>
  )
}
