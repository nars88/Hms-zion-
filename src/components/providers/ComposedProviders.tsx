'use client'

import { type ReactNode } from 'react'
import { AuthProvider } from '@/contexts/AuthContext'
import { RevenueProvider } from '@/contexts/RevenueContext'
import { WaitingListProvider } from '@/contexts/WaitingListContext'
import { PatientRegistryProvider } from '@/contexts/PatientRegistryContext'
import { LabResultsProvider } from '@/contexts/LabResultsContext'
import { VisitDataProvider } from '@/contexts/VisitDataContext'
import { CentralizedBillingProvider } from '@/contexts/CentralizedBillingContext'
import { AppointmentsProvider } from '@/contexts/AppointmentsContext'
import { PharmacyProvider } from '@/contexts/PharmacyContext'
import { InventoryProvider } from '@/contexts/InventoryContext'
import { StatsProvider } from '@/contexts/StatsContext'
import { QRScannerProvider } from '@/contexts/QRScannerContext'

const providers = [
  AuthProvider,
  RevenueProvider,
  PatientRegistryProvider,
  WaitingListProvider,
  LabResultsProvider,
  VisitDataProvider,
  CentralizedBillingProvider,
  AppointmentsProvider,
  PharmacyProvider,
  InventoryProvider,
  StatsProvider,
  QRScannerProvider,
] as const

function composeProviders(inner: ReactNode): ReactNode {
  return providers.reduceRight((acc, Provider) => <Provider>{acc}</Provider>, inner)
}

export function ComposedProviders({ children }: { children: ReactNode }) {
  return <>{composeProviders(children)}</>
}
