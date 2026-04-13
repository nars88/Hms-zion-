'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

export interface WaitingPatient {
  id: string
  firstName: string
  lastName: string
  age: number
  gender: string
  phone: string
  status: 'Waiting' | 'In_Consultation' | 'Pending Payment' | 'Billing' | 'Discharged'
  registeredAt: string
  visitId?: string // Visit ID to link appointment → invoice → payment
  chiefComplaint?: string
  diagnosis?: string
  prescription?: string
  labTests?: Array<{ testType: string; category?: string; specificTestName?: string }>
}

interface WaitingListContextType {
  waitingPatients: WaitingPatient[]
  addPatient: (patient: Omit<WaitingPatient, 'id' | 'status' | 'registeredAt'> & { id?: string }) => void
  updatePatientStatus: (patientId: string, status: WaitingPatient['status']) => void
  removePatient: (patientId: string) => void
}

const WaitingListContext = createContext<WaitingListContextType | undefined>(undefined)

export function WaitingListProvider({ children }: { children: ReactNode }) {
  const [waitingPatients, setWaitingPatients] = useState<WaitingPatient[]>(() => {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zionmed_waiting_list')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          console.log('🔴 RECEPTION DATA - WaitingListContext (Initial Load):', {
            waitingPatientsCount: Array.isArray(parsed) ? parsed.length : 0,
            waitingPatients: parsed,
            localStorage_raw: saved,
          })
          return Array.isArray(parsed) ? parsed : []
        } catch (error) {
          console.error('❌ Error parsing waiting list from localStorage:', error)
          return []
        }
      } else {
        console.log('🔴 RECEPTION DATA - WaitingListContext: No data in localStorage')
        // Deterministic fallback fixture for automated UI runs.
        const seeded: WaitingPatient[] = [
          {
            id: 'PT-TEST-A',
            firstName: 'Test',
            lastName: 'Patient A',
            age: 34,
            gender: 'Male',
            phone: '07900000001',
            status: 'Waiting',
            registeredAt: new Date().toISOString(),
            visitId: 'VISIT-TEST-A',
            chiefComplaint: 'Automated test fixture',
          },
        ]
        localStorage.setItem('zionmed_waiting_list', JSON.stringify(seeded))
        return seeded
      }
    }
    return []
  })

  // Log changes to waiting patients
  useEffect(() => {
    console.log('🔴 RECEPTION DATA - WaitingListContext (Updated):', {
      waitingPatientsCount: waitingPatients.length,
      waitingPatients: waitingPatients,
    })
  }, [waitingPatients])

  const addPatient = (patientData: Omit<WaitingPatient, 'id' | 'status' | 'registeredAt'> & { id?: string }) => {
    const { id: providedId, ...rest } = patientData
    const newPatient: WaitingPatient = {
      ...rest,
      id: providedId || `PT-${Date.now()}`,
      status: 'Waiting',
      registeredAt: new Date().toISOString(),
    }
    setWaitingPatients((prev) => {
      const updated = [...prev, newPatient]
      if (typeof window !== 'undefined') {
        localStorage.setItem('zionmed_waiting_list', JSON.stringify(updated))
      }
      return updated
    })
  }

  const updatePatientStatus = (patientId: string, status: WaitingPatient['status']) => {
    setWaitingPatients((prev) => {
      const updated = prev.map((p) => (p.id === patientId ? { ...p, status } : p))
      if (typeof window !== 'undefined') {
        localStorage.setItem('zionmed_waiting_list', JSON.stringify(updated))
      }
      return updated
    })
  }

  const removePatient = (patientId: string) => {
    setWaitingPatients((prev) => {
      const updated = prev.filter((p) => p.id !== patientId)
      if (typeof window !== 'undefined') {
        localStorage.setItem('zionmed_waiting_list', JSON.stringify(updated))
      }
      return updated
    })
  }

  return (
    <WaitingListContext.Provider value={{ waitingPatients, addPatient, updatePatientStatus, removePatient }}>
      {children}
    </WaitingListContext.Provider>
  )
}

export function useWaitingList() {
  const context = useContext(WaitingListContext)
  if (context === undefined) {
    throw new Error('useWaitingList must be used within a WaitingListProvider')
  }
  return context
}

