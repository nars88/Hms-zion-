import type { Metadata } from 'next'
import './globals.css'
import { ComposedProviders } from '@/components/providers/ComposedProviders'
import GlobalScannerProvider from '@/components/shared/GlobalScannerProvider'

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
    <html lang="en">
      <body className="text-primary">
        <ComposedProviders>
          <GlobalScannerProvider>{children}</GlobalScannerProvider>
        </ComposedProviders>
      </body>
    </html>
  )
}

