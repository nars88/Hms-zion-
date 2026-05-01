'use client'

import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react'

export interface PatientRecord {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  age: number
  gender: string
  phone: string
  email: string
  address: string
  emergencyContact: string
  emergencyPhone: string
  bloodGroup: string
  allergies: string
  medicalHistory: string
  registeredAt: string
  lastVisitAt?: string
  visitCount: number
}

interface PatientRegistryContextType {
  patients: PatientRecord[]
  searchPatients: (query: string, waitingPatients?: any[]) => PatientRecord[]
  getPatientByPhone: (phone: string) => PatientRecord | undefined
  getPatientById: (id: string) => PatientRecord | undefined
  registerPatient: (patientData: Omit<PatientRecord, 'id' | 'registeredAt' | 'visitCount'>) => PatientRecord
  updatePatient: (id: string, updates: Partial<PatientRecord>) => Promise<void>
  isNewPatient: (phone: string) => boolean
  seedTestData: () => number
}

const PatientRegistryContext = createContext<PatientRegistryContextType | undefined>(undefined)

export function PatientRegistryProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<PatientRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zionmed_patient_registry')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          console.log('📦 Loaded patients from localStorage:', Array.isArray(parsed) ? parsed.length : 0, 'patients')
          if (Array.isArray(parsed)) {
            return parsed
          }
          return []
        } catch (error) {
          console.error('❌ Error parsing patients from localStorage:', error)
          return []
        }
      } else {
        console.log('📦 No patients found in localStorage')
      }
    }
    return []
  })
  
  // Log patients count on mount and changes for debugging
  useEffect(() => {
    console.log('🔴 RECEPTION DATA - PatientRegistryContext:', {
      patientsCount: patients.length,
      patients: patients,
      localStorage_raw: typeof window !== 'undefined' ? localStorage.getItem('zionmed_patient_registry') : 'N/A',
    })
    if (patients.length > 0) {
      console.log('📋 Sample patient:', {
        id: patients[0].id,
        name: `${patients[0].firstName} ${patients[0].lastName}`,
        phone: patients[0].phone
      })
    }
  }, [patients])

  // Index patients by phone for fast lookup
  const phoneIndex = useMemo(() => {
    const index: Record<string, PatientRecord> = {}
    patients.forEach(patient => {
      if (patient.phone) {
        index[patient.phone] = patient
      }
    })
    return index
  }, [patients])

  // Helper function to normalize variant unicode letters for robust search
  const normalizeArabic = (text: string): string => {
    if (!text) return ''
    return text
      .replace(/[\u0625\u0623\u0622\u0627]/g, '\u0627')
      .replace(/\u0649/g, '\u064A')
      .replace(/\u0629/g, '\u0647')
      .toLowerCase()
      .trim()
  }

  const searchPatients = (query: string, waitingPatients?: any[]): PatientRecord[] => {
    if (!query || !query.trim()) {
      console.log('🔍 Search: Empty query')
      return []
    }
    
    const trimmedQuery = query.trim()
    const lowerQuery = trimmedQuery.toLowerCase()
    const normalizedQuery = normalizeArabic(trimmedQuery)
    
    console.log('🔍 Search Query:', {
      original: query,
      trimmed: trimmedQuery,
      lower: lowerQuery,
      normalized: normalizedQuery,
      totalPatients: patients.length,
      waitingPatientsCount: waitingPatients?.length || 0
    })
    
    // Combine registry patients with waiting list patients (unified search)
    const allPatients: PatientRecord[] = [...patients]
    
    // Add waiting list patients that aren't in registry yet
    if (Array.isArray(waitingPatients)) {
      waitingPatients.forEach(waitingPatient => {
        if (waitingPatient && !patients.find(p => p.id === waitingPatient.id)) {
          // Convert waiting patient to PatientRecord format
          const convertedPatient: PatientRecord = {
            id: waitingPatient.id,
            firstName: waitingPatient.firstName || '',
            lastName: waitingPatient.lastName || '',
            dateOfBirth: '', // Not available in waiting list
            age: waitingPatient.age || 0,
            gender: waitingPatient.gender || '',
            phone: waitingPatient.phone || '',
            email: '',
            address: '',
            emergencyContact: '',
            emergencyPhone: '',
            bloodGroup: '',
            allergies: '',
            medicalHistory: '',
            registeredAt: waitingPatient.registeredAt || new Date().toISOString(),
            visitCount: 1,
          }
          allPatients.push(convertedPatient)
        }
      })
    }
    
    // Check if we have any patients
    if (!Array.isArray(allPatients) || allPatients.length === 0) {
      console.log('⚠️ No patients found in registry or waiting list')
      return []
    }
    
    // Fast indexed search by phone (exact match)
    if (phoneIndex[lowerQuery] || phoneIndex[trimmedQuery]) {
      const exactMatch = phoneIndex[lowerQuery] || phoneIndex[trimmedQuery]
      if (exactMatch) {
        console.log('✅ Phone exact match found:', exactMatch.firstName, exactMatch.lastName)
        return [exactMatch]
      }
    }
    
    // Full-text search across name, phone, and ID (supports partial matching - LIKE behavior)
    const results = allPatients.filter(patient => {
      if (!patient) return false
      
      // Normalize patient data for search
      const firstName = (patient.firstName || '').trim()
      const lastName = (patient.lastName || '').trim()
      const fullName = `${firstName} ${lastName}`.trim()
      
      const firstNameLower = firstName.toLowerCase()
      const lastNameLower = lastName.toLowerCase()
      const fullNameLower = fullName.toLowerCase()
      
      const firstNameNormalized = normalizeArabic(firstName)
      const lastNameNormalized = normalizeArabic(lastName)
      const fullNameNormalized = normalizeArabic(fullName)
      
      const phone = (patient.phone || '').toLowerCase().trim()
      const id = (patient.id || '').toLowerCase().trim()
      
      // Search in multiple fields with partial matching (case-insensitive, Arabic-insensitive)
      const matches = (
        // Exact matches
        firstNameLower === lowerQuery ||
        lastNameLower === lowerQuery ||
        fullNameLower === lowerQuery ||
        phone === lowerQuery ||
        id === lowerQuery ||
        // Partial matches (LIKE behavior)
        firstNameLower.includes(lowerQuery) ||
        lastNameLower.includes(lowerQuery) ||
        fullNameLower.includes(lowerQuery) ||
        phone.includes(lowerQuery) ||
        id.includes(lowerQuery) ||
        // Normalized Arabic matches
        firstNameNormalized.includes(normalizedQuery) ||
        lastNameNormalized.includes(normalizedQuery) ||
        fullNameNormalized.includes(normalizedQuery)
      )
      
      if (matches) {
        console.log('✅ Match found:', patient.firstName, patient.lastName, patient.phone)
      }
      
      return matches
    })
    
    console.log(`📊 Search Results: ${results.length} patient(s) found from unified source`)
    
    return results.slice(0, 10) // Limit to 10 results for performance
  }

  const getPatientByPhone = (phone: string): PatientRecord | undefined => {
    return phoneIndex[phone] || patients.find(p => p.phone === phone)
  }

  const getPatientById = (id: string): PatientRecord | undefined => {
    return patients.find(p => p.id === id)
  }

  const registerPatient = (patientData: Omit<PatientRecord, 'id' | 'registeredAt' | 'visitCount'>): PatientRecord => {
    // Check if patient already exists by phone
    const existingPatient = getPatientByPhone(patientData.phone)
    
    if (existingPatient) {
      // Update existing patient
      const updated: PatientRecord = {
        ...existingPatient,
        ...patientData,
        lastVisitAt: new Date().toISOString(),
        visitCount: existingPatient.visitCount + 1,
      }
      setPatients(prev => {
        const updatedList = prev.map(p => p.id === updated.id ? updated : p)
        if (typeof window !== 'undefined') {
          localStorage.setItem('zionmed_patient_registry', JSON.stringify(updatedList))
        }
        return updatedList
      })
      return updated
    } else {
      // Create new patient
      const newPatient: PatientRecord = {
        ...patientData,
        id: `PT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        registeredAt: new Date().toISOString(),
        visitCount: 1,
      }
      setPatients(prev => {
        const updated = [...prev, newPatient]
        if (typeof window !== 'undefined') {
          localStorage.setItem('zionmed_patient_registry', JSON.stringify(updated))
        }
        return updated
      })
      return newPatient
    }
  }

  const updatePatient = (id: string, updates: Partial<PatientRecord>) => {
    console.log('🔄 updatePatient called:', { id, updates })
    console.log('🔄 Current patients array length:', patients.length)
    console.log('🔄 Looking for patient ID:', id)
    
    return new Promise<void>((resolve, reject) => {
      try {
        // First, check if patient exists
        const existingPatient = patients.find(p => p.id === id)
        if (!existingPatient) {
          const errorMsg = `Patient with ID ${id} not found in registry. Available IDs: ${patients.map(p => p.id).join(', ')}`
          console.error('❌', errorMsg)
          reject(new Error(errorMsg))
          return
        }

        console.log('✅ Patient found:', existingPatient)

        setPatients(prev => {
          const patientIndex = prev.findIndex(p => p.id === id)
          
          if (patientIndex === -1) {
            console.error('❌ Patient not found in state array:', id)
            // Don't reject here, just return prev to avoid breaking React state
            setTimeout(() => reject(new Error(`Patient with ID ${id} not found in state`)), 0)
            return prev
          }

          const updated = prev.map(p => {
            if (p.id === id) {
              const merged = { ...p, ...updates }
              console.log('✅ Patient merged:', { 
                old: { firstName: p.firstName, phone: p.phone, age: p.age },
                new: { firstName: merged.firstName, phone: merged.phone, age: merged.age }
              })
              return merged
            }
            return p
          })
          
          // CRITICAL: Save to localStorage synchronously
          if (typeof window !== 'undefined') {
            try {
              const jsonString = JSON.stringify(updated)
              localStorage.setItem('zionmed_patient_registry', jsonString)
              
              // Verify save by reading back
              const saved = JSON.parse(localStorage.getItem('zionmed_patient_registry') || '[]')
              const savedPatient = saved.find((p: PatientRecord) => p.id === id)
              
              if (!savedPatient) {
                console.error('❌ Patient not found in saved data')
                setTimeout(() => reject(new Error('Failed to verify save to localStorage')), 0)
                return prev
              }
              
              console.log('💾 Saved to localStorage successfully:', {
                id: savedPatient.id,
                firstName: savedPatient.firstName,
                phone: savedPatient.phone,
                age: savedPatient.age,
                bloodGroup: savedPatient.bloodGroup
              })
              
              // Resolve after successful save
              setTimeout(() => {
                console.log('✅ Promise resolved - update complete')
                resolve()
              }, 100) // Small delay to ensure state update propagates
              
              return updated
            } catch (storageError: any) {
              console.error('❌ localStorage error:', storageError)
              const errorMsg = storageError?.message || 'Failed to save to localStorage'
              setTimeout(() => reject(new Error(errorMsg)), 0)
              return prev
            }
          } else {
            // Server-side: just resolve
            setTimeout(() => resolve(), 0)
            return updated
          }
        })
      } catch (error: any) {
        console.error('❌ updatePatient error:', error)
        const errorMsg = error?.message || 'Unknown error updating patient'
        reject(new Error(errorMsg))
      }
    })
  }

  const isNewPatient = (phone: string): boolean => {
    return !getPatientByPhone(phone)
  }

  const seedTestData = () => {
    const mockPatients: Omit<PatientRecord, 'id' | 'registeredAt' | 'visitCount'>[] = [
      {
        firstName: 'Narjes',
        lastName: 'Abd',
        dateOfBirth: '1995-03-15',
        age: 29,
        gender: 'Female',
        phone: '07501234567',
        email: 'narjes.abd@example.com',
        address: 'Baghdad, Karrada',
        emergencyContact: 'Ali Abd',
        emergencyPhone: '07501234568',
        bloodGroup: 'O+',
        allergies: 'None',
        medicalHistory: 'None',
      },
      {
        firstName: 'Ahmed',
        lastName: 'Ali',
        dateOfBirth: '1988-07-22',
        age: 36,
        gender: 'Male',
        phone: '07501234569',
        email: 'ahmed.ali@example.com',
        address: 'Baghdad, Mansour',
        emergencyContact: 'Fatima Ali',
        emergencyPhone: '07501234570',
        bloodGroup: 'A+',
        allergies: 'None',
        medicalHistory: 'None',
      },
      {
        firstName: 'Sara',
        lastName: 'Mohammed',
        dateOfBirth: '1992-11-08',
        age: 32,
        gender: 'Female',
        phone: '07501234571',
        email: 'sara.mohammed@example.com',
        address: 'Baghdad, Jadriya',
        emergencyContact: 'Hassan Mohammed',
        emergencyPhone: '07501234572',
        bloodGroup: 'B+',
        allergies: 'None',
        medicalHistory: 'None',
      },
      {
        firstName: 'Mohammed',
        lastName: 'Hassan',
        dateOfBirth: '1990-05-30',
        age: 34,
        gender: 'Male',
        phone: '07501234573',
        email: 'mohammed.hassan@example.com',
        address: 'Baghdad, Kadhimiya',
        emergencyContact: 'Zeinab Hassan',
        emergencyPhone: '07501234574',
        bloodGroup: 'AB+',
        allergies: 'None',
        medicalHistory: 'None',
      },
      {
        firstName: 'Fatima',
        lastName: 'Ibrahim',
        dateOfBirth: '1997-09-12',
        age: 27,
        gender: 'Female',
        phone: '07501234575',
        email: 'fatima.ibrahim@example.com',
        address: 'Baghdad, Shaab',
        emergencyContact: 'Ali Ibrahim',
        emergencyPhone: '07501234576',
        bloodGroup: 'O-',
        allergies: 'None',
        medicalHistory: 'None',
      },
      {
        firstName: 'Ali',
        lastName: 'Kadhim',
        dateOfBirth: '1985-12-25',
        age: 39,
        gender: 'Male',
        phone: '07501234577',
        email: 'ali.kadhim@example.com',
        address: 'Baghdad, Rusafa',
        emergencyContact: 'Maryam Kadhim',
        emergencyPhone: '07501234578',
        bloodGroup: 'A-',
        allergies: 'None',
        medicalHistory: 'None',
      },
      {
        firstName: 'Zeinab',
        lastName: 'Hussein',
        dateOfBirth: '1993-02-18',
        age: 31,
        gender: 'Female',
        phone: '07501234579',
        email: 'zeinab.hussein@example.com',
        address: 'Baghdad, Karkh',
        emergencyContact: 'Mohammed Hussein',
        emergencyPhone: '07501234580',
        bloodGroup: 'B-',
        allergies: 'None',
        medicalHistory: 'None',
      },
      {
        firstName: 'Hassan',
        lastName: 'Mahdi',
        dateOfBirth: '1989-08-05',
        age: 35,
        gender: 'Male',
        phone: '07501234581',
        email: 'hassan.mahdi@example.com',
        address: 'Baghdad, Adhamiya',
        emergencyContact: 'Saad Mahdi',
        emergencyPhone: '07501234582',
        bloodGroup: 'AB-',
        allergies: 'None',
        medicalHistory: 'None',
      },
    ]

    // Check which patients already exist
    const existingPhones = new Set(patients.map(p => p.phone))
    const newPatients = mockPatients.filter(p => !existingPhones.has(p.phone))

    if (newPatients.length > 0) {
      const now = new Date()
      const seededPatients: PatientRecord[] = newPatients.map((patient, index) => ({
        ...patient,
        id: `PT-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
        registeredAt: new Date(now.getTime() - index * 86400000).toISOString(), // Spread over days
        visitCount: Math.floor(Math.random() * 5) + 1, // Random 1-5 visits
      }))

      setPatients(prev => {
        const updated = [...prev, ...seededPatients]
        if (typeof window !== 'undefined') {
          localStorage.setItem('zionmed_patient_registry', JSON.stringify(updated))
        }
        return updated
      })

      return seededPatients.length
    }

    return 0
  }

  return (
    <PatientRegistryContext.Provider
      value={{
        patients,
        searchPatients,
        getPatientByPhone,
        getPatientById,
        registerPatient,
        updatePatient,
        isNewPatient,
        seedTestData,
      }}
    >
      {children}
    </PatientRegistryContext.Provider>
  )
}

export function usePatientRegistry() {
  const context = useContext(PatientRegistryContext)
  if (context === undefined) {
    throw new Error('usePatientRegistry must be used within a PatientRegistryProvider')
  }
  return context
}

