'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export interface VisitData {
  patientId: string
  patientName: string
  /** Optional; shown in medical record when present */
  chiefComplaint?: string
  diagnosis: string
  prescription: string
  notes: string
  labTests: Array<{
    testType: string
    category?: string
    specificTestName?: string
    department?: 'Lab' | 'Radiology'
  }>
  completedAt: string
}

interface VisitDataContextType {
  visitData: Record<string, VisitData>
  saveVisitData: (data: VisitData) => void
  getVisitData: (patientId: string) => VisitData | undefined
}

const VisitDataContext = createContext<VisitDataContextType | undefined>(undefined)

export function VisitDataProvider({ children }: { children: ReactNode }) {
  const [visitData, setVisitData] = useState<Record<string, VisitData>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zionmed_visit_data')
      if (saved) {
        return JSON.parse(saved)
      }
    }
    return {}
  })

  const saveVisitData = (data: VisitData) => {
    setVisitData((prev) => {
      const updated = { ...prev, [data.patientId]: data }
      if (typeof window !== 'undefined') {
        localStorage.setItem('zionmed_visit_data', JSON.stringify(updated))
      }
      return updated
    })
  }

  const getVisitData = (patientId: string) => {
    return visitData[patientId]
  }

  return (
    <VisitDataContext.Provider value={{ visitData, saveVisitData, getVisitData }}>
      {children}
    </VisitDataContext.Provider>
  )
}

export function useVisitData() {
  const context = useContext(VisitDataContext)
  if (context === undefined) {
    throw new Error('useVisitData must be used within a VisitDataProvider')
  }
  return context
}

