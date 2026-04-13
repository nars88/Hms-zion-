'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { usePatientRegistry } from '@/contexts/PatientRegistryContext'
import { useWaitingList } from '@/contexts/WaitingListContext'
import { Search, User, Phone, Calendar, Database, FileText, LogIn, QrCode } from 'lucide-react'
import MedicalRecordModal from './MedicalRecordModal'
import { generateVisitId } from '@/lib/visitIdGenerator'

type PatientSearchProps = {
  onPatientSelected?: (patient: any) => void
  onPatientCleared?: () => void
}

export default function PatientSearch({ onPatientSelected, onPatientCleared }: PatientSearchProps) {
  const { searchPatients, isNewPatient, seedTestData, patients } = usePatientRegistry()
  const { waitingPatients, addPatient } = useWaitingList()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [showResults, setShowResults] = useState(false)
  const [seeded, setSeeded] = useState(false)
  const [showMedicalRecord, setShowMedicalRecord] = useState(false)
  const [medicalRecordPatient, setMedicalRecordPatient] = useState<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Unified search across PatientRegistry and WaitingList
  const searchResults = useMemo(() => {
    const trimmed = searchQuery.trim()
    if (!trimmed || trimmed.length < 1) return []
    return searchPatients(trimmed, waitingPatients)
  }, [searchQuery, searchPatients, waitingPatients])

  // Auto-focus on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Seed test data on first load if no patients exist
  useEffect(() => {
    if (patients.length === 0 && !seeded) {
      const count = seedTestData()
      if (count > 0) {
        setSeeded(true)
        console.log(`✅ Added ${count} test patients to database`)
      }
    }
  }, [patients.length, seeded, seedTestData])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleViewMedicalRecord = (patient: any, e: React.MouseEvent) => {
    e.stopPropagation()
    handleSelectPatient(patient)
    setMedicalRecordPatient(patient)
    setShowMedicalRecord(true)
  }

  const handleCheckIn = (patient: any, e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Check if patient is already in waiting list
    const alreadyWaiting = waitingPatients.some(p => p.id === patient.id || p.phone === patient.phone)
    
    if (alreadyWaiting) {
      handleSelectPatient(patient)
      alert(`Patient ${patient.firstName} ${patient.lastName} is already in the waiting list.`)
      return
    }

    // Add patient to waiting list
    const visitId = generateVisitId()
    addPatient({
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      age: patient.age,
      gender: patient.gender,
      phone: patient.phone,
      visitId,
      chiefComplaint: 'Returning patient check-in',
    })

    // Select patient and include the new visitId (enables QR print)
    handleSelectPatient({ ...patient, visitId })

    alert(`✅ ${patient.firstName} ${patient.lastName} has been checked in and added to the waiting list!`)
    setSearchQuery('')
    setShowResults(false)
  }

  const handleSelectPatient = (patient: any) => {
    setSelectedPatient(patient)
    setSearchQuery(`${patient.firstName} ${patient.lastName}`)
    setShowResults(false)
    
    // Trigger custom event for auto-fill
    window.dispatchEvent(new CustomEvent('patientSelected', { detail: patient }))
    onPatientSelected?.(patient)
  }

  const handleClear = () => {
    setSearchQuery('')
    setSelectedPatient(null)
    setShowResults(false)
    window.dispatchEvent(new CustomEvent('patientCleared'))
    onPatientCleared?.()
  }

  const handleSeedData = () => {
    const count = seedTestData()
    if (count > 0) {
      setSeeded(true)
      alert(`✅ تم إضافة ${count} مريض تجريبي إلى قاعدة البيانات!\n\nيمكنك الآن البحث عن:\n- نرجس\n- احمد\n- سارة\n- محمد\n- فاطمة`)
      inputRef.current?.focus()
    } else {
      alert('جميع المرضى التجريبيين موجودون بالفعل في قاعدة البيانات.')
    }
  }

  return (
    <div className="w-full">
      {/* Full-width search bar — search icon left, QR icon right (matches Archive page) */}
      <div className="relative">
        <Search
          className={`absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${
            searchQuery ? 'text-cyan-400' : 'text-slate-400'
          }`}
        />
        <QrCode className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 opacity-50" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search Patient Name, ID or scan QR code..."
          value={searchQuery}
          onChange={(e) => {
            const value = e.target.value
            setSearchQuery(value)
            setShowResults(true)
            setSelectedPatient(null)
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            // If search yields exactly one result, auto-select it so QR printing activates.
            if (searchResults.length === 1) {
              handleSelectPatient(searchResults[0])
              return
            }
            // If exact ID match exists, auto-select it.
            const cleaned = searchQuery.trim()
            if (!cleaned) return
            const exact = searchResults.find((p) => String(p.id).toLowerCase() === cleaned.toLowerCase())
            if (exact) handleSelectPatient(exact)
          }}
          onFocus={() => {
            if (searchResults.length > 0) setShowResults(true)
          }}
          className="w-full pl-12 pr-12 py-4 bg-slate-900/50 border-2 border-slate-800/50 rounded-xl text-primary placeholder-slate-500 focus:outline-none focus:ring-2 focus:border-slate-600 focus:ring-slate-700/20 text-base transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-400 transition-colors w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-800/50"
            title="Clear search"
          >
            ×
          </button>
        )}
      </div>
      {/* Seed Data Button — below bar when no patients */}
      {patients.length === 0 && (
        <div className="mt-3">
          <button
            onClick={handleSeedData}
            className="px-4 py-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/15 transition-all flex items-center gap-2 text-sm font-medium"
          >
            <Database size={18} />
            <span>إضافة بيانات تجريبية</span>
          </button>
        </div>
      )}

      {/* Search Results - Instant Display */}
      {showResults && searchQuery.length >= 2 && (
        <div 
          className="mt-4 glass rounded-xl border-2 border-slate-700/50 max-h-96 overflow-y-auto shadow-xl"
          style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)' }}
        >
          {searchResults.length > 0 ? (
            <>
              <div className="sticky top-0 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 px-4 py-3 z-10">
                <p className="text-sm text-secondary font-medium">
                  Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for: <span className="text-cyan-400 font-semibold">&quot;{searchQuery}&quot;</span>
                </p>
              </div>
              <div className="p-2 space-y-2">
                {searchResults.map((patient, index) => {
                  const isNew = isNewPatient(patient.phone)
                  const isAlreadyWaiting = waitingPatients.some(p => p.id === patient.id || p.phone === patient.phone)
                  
                  return (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => handleSelectPatient(patient)}
                      className={`w-full p-4 glass rounded-lg border border-slate-800/40 hover:border-cyan-500/30 transition-all group shadow-md hover:shadow-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/25 ${
                        index < searchResults.length - 1 ? 'mb-2 border-b-2 border-slate-700/30' : ''
                      }`}
                      style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
                    >
                      {/* Patient Info Row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <User size={16} className="text-cyan-400 flex-shrink-0" />
                            <p className="text-sm text-primary font-semibold truncate">
                              {patient.firstName} {patient.lastName}
                            </p>
                            {isNew ? (
                              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs font-bold flex-shrink-0">
                                New Patient
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs font-bold flex-shrink-0">
                                Returning ({patient.visitCount || 0} visit{patient.visitCount !== 1 ? 's' : ''})
                              </span>
                            )}
                            {isAlreadyWaiting && (
                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-xs font-bold flex-shrink-0">
                                In Queue
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-secondary">
                            <div className="flex items-center gap-1.5">
                              <Phone size={12} className="text-slate-500" />
                              <span>{patient.phone}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar size={12} className="text-slate-500" />
                              <span>{patient.age} years, {patient.gender}</span>
                            </div>
                            {patient.bloodGroup && (
                              <span className="px-1.5 py-0.5 bg-slate-800/50 rounded text-xs">
                                {patient.bloodGroup}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            ID: {patient.id}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons Row */}
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-800/30">
                        <button
                          onClick={(e) => handleViewMedicalRecord(patient, e)}
                          className="flex-1 px-4 py-2.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/15 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                        >
                          <FileText size={16} />
                          <span>View Medical Record</span>
                        </button>
                        <button
                          onClick={(e) => handleCheckIn(patient, e)}
                          disabled={isAlreadyWaiting}
                          className="flex-1 px-4 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/15 transition-all flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <LogIn size={16} />
                          <span>{isAlreadyWaiting ? 'Already in Queue' : 'Check-In'}</span>
                        </button>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="p-12 text-center">
              <div className="mb-4">
                <Search size={48} className="text-slate-500/50 mx-auto" />
              </div>
              <p className="text-base text-slate-400 mb-2 font-medium">No patients found for <span className="text-slate-300">&quot;{searchQuery}&quot;</span></p>
              <p className="text-sm text-slate-500">Try searching by name or phone number</p>
            </div>
          )}
        </div>
      )}

      {/* Medical Record Modal */}
      {showMedicalRecord && medicalRecordPatient && (
        <MedicalRecordModal
          patient={medicalRecordPatient}
          onClose={() => {
            setShowMedicalRecord(false)
            setMedicalRecordPatient(null)
          }}
        />
      )}
    </div>
  )
}
