'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

export interface LabRequest {
  id: string
  patientId: string
  patientName: string
  visitId: string
  testType: string
  category?: 'Laboratory' | 'X-Ray' | 'Ultrasound' | 'CT_Scan' | 'MRI' // Optional for backward compatibility
  specificTestName?: string // Optional for backward compatibility
  department?: 'Lab' | 'Radiology' // Auto-set based on category
  requestedBy: string // Doctor ID
  requestedAt: string
  status: 'Pending' | 'Completed'
  result?: string
  completedAt?: string
  completedBy?: string
}

interface LabResultsContextType {
  labRequests: LabRequest[]
  addLabRequest: (request: Omit<LabRequest, 'id' | 'status' | 'requestedAt'>) => void
  updateLabResult: (requestId: string, result: string, completedBy: string) => void
  deleteLabRequest: (requestId: string) => void
  getLabResultsForPatient: (patientId: string) => LabRequest[]
  getLabRequestsByDepartment: (department: 'Lab' | 'Radiology') => LabRequest[]
}

const LabResultsContext = createContext<LabResultsContextType | undefined>(undefined)

export function LabResultsProvider({ children }: { children: ReactNode }) {
  const [labRequests, setLabRequests] = useState<LabRequest[]>(() => {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zionmed_lab_requests')
      if (saved) {
        return JSON.parse(saved)
      }
    }
    return []
  })

  const addLabRequest = (requestData: Omit<LabRequest, 'id' | 'status' | 'requestedAt'>) => {
    const newRequest: LabRequest = {
      ...requestData,
      id: `LAB-${Date.now()}`,
      status: 'Pending',
      requestedAt: new Date().toISOString(),
    }
    setLabRequests((prev) => {
      const updated = [...prev, newRequest]
      if (typeof window !== 'undefined') {
        localStorage.setItem('zionmed_lab_requests', JSON.stringify(updated))
      }
      return updated
    })
  }

  const updateLabResult = (requestId: string, result: string, completedBy: string) => {
    setLabRequests((prev) => {
      const updated = prev.map((req) =>
        req.id === requestId
          ? {
              ...req,
              status: 'Completed' as const,
              result,
              completedAt: new Date().toISOString(),
              completedBy,
            }
          : req
      )
      if (typeof window !== 'undefined') {
        localStorage.setItem('zionmed_lab_requests', JSON.stringify(updated))
      }
      return updated
    })
  }

  const getLabResultsForPatient = (patientId: string) => {
    return labRequests.filter((req) => req.patientId === patientId && req.status === 'Completed')
  }

  const deleteLabRequest = (requestId: string) => {
    setLabRequests((prev) => {
      const updated = prev.filter((req) => req.id !== requestId)
      if (typeof window !== 'undefined') {
        localStorage.setItem('zionmed_lab_requests', JSON.stringify(updated))
      }
      return updated
    })
  }

  const getLabRequestsByDepartment = (department: 'Lab' | 'Radiology') => {
    return labRequests.filter((req) => req.department === department && req.status === 'Pending')
  }

  return (
    <LabResultsContext.Provider value={{ labRequests, addLabRequest, updateLabResult, deleteLabRequest, getLabResultsForPatient, getLabRequestsByDepartment }}>
      {children}
    </LabResultsContext.Provider>
  )
}

export function useLabResults() {
  const context = useContext(LabResultsContext)
  if (context === undefined) {
    throw new Error('useLabResults must be used within a LabResultsProvider')
  }
  return context
}

