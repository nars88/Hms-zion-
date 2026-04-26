import type { ReactNode } from 'react'
import { ComposedProviders } from '@/components/providers/ComposedProviders'
import GlobalScannerProvider from '@/components/shared/GlobalScannerProvider'

// This layout wraps every authenticated / system route (admin, doctor, lab,
// pharmacy, ...). Public pages like the marketing landing (`/`) stay under
// the bare root layout and therefore never pay for loading these providers
// or the USB scanner hook.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ComposedProviders>
      <GlobalScannerProvider>{children}</GlobalScannerProvider>
    </ComposedProviders>
  )
}
