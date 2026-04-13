'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

export interface PrescriptionItem {
  id: string
  medicineName: string
  scientificName?: string
  commercialName?: string
  dosage: string
  frequency: string
  duration?: string
  notes?: string
}

export interface Prescription {
  id: string
  visitId: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  items: PrescriptionItem[]
  status: 'Pending' | 'Dispensed_Internal' | 'Dispensed_External' | 'Cancelled'
  dispensedAt?: string
  dispensedBy?: string
  createdAt: string
}

interface PharmacyContextType {
  prescriptions: Prescription[]
  createPrescription: (prescription: Omit<Prescription, 'id' | 'status' | 'createdAt'>) => Prescription
  getPrescriptionByVisitId: (visitId: string) => Prescription | undefined
  getPrescriptionsByPatientId: (patientId: string) => Prescription[]
  updatePrescriptionStatus: (prescriptionId: string, status: Prescription['status'], dispensedBy?: string) => void
  getPendingPrescriptions: () => Prescription[]
}

const PharmacyContext = createContext<PharmacyContextType | undefined>(undefined)

export function PharmacyProvider({ children }: { children: ReactNode }) {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zionmed_prescriptions')
      if (saved) {
        return JSON.parse(saved)
      }
    }
    return []
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zionmed_prescriptions', JSON.stringify(prescriptions))
    }
  }, [prescriptions])

  const createPrescription = (prescriptionData: Omit<Prescription, 'id' | 'status' | 'createdAt'>): Prescription => {
    const newPrescription: Prescription = {
      ...prescriptionData,
      id: `PRES-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'Pending',
      createdAt: new Date().toISOString(),
    }

    setPrescriptions((prev) => [...prev, newPrescription])
    return newPrescription
  }

  const getPrescriptionByVisitId = (visitId: string): Prescription | undefined => {
    return prescriptions.find((pres) => pres.visitId === visitId)
  }

  const getPrescriptionsByPatientId = (patientId: string): Prescription[] => {
    return prescriptions.filter((pres) => pres.patientId === patientId)
  }

  const updatePrescriptionStatus = (
    prescriptionId: string,
    status: Prescription['status'],
    dispensedBy?: string
  ) => {
    setPrescriptions((prev) =>
      prev.map((pres) =>
        pres.id === prescriptionId
          ? {
              ...pres,
              status,
              dispensedAt: status.includes('Dispensed') ? new Date().toISOString() : pres.dispensedAt,
              dispensedBy: dispensedBy || pres.dispensedBy,
            }
          : pres
      )
    )
  }

  const getPendingPrescriptions = (): Prescription[] => {
    return prescriptions.filter((pres) => pres.status === 'Pending')
  }

  return (
    <PharmacyContext.Provider
      value={{
        prescriptions,
        createPrescription,
        getPrescriptionByVisitId,
        getPrescriptionsByPatientId,
        updatePrescriptionStatus,
        getPendingPrescriptions,
      }}
    >
      {children}
    </PharmacyContext.Provider>
  )
}

export function usePharmacy() {
  const context = useContext(PharmacyContext)
  if (context === undefined) {
    throw new Error('usePharmacy must be used within a PharmacyProvider')
  }
  return context
}

