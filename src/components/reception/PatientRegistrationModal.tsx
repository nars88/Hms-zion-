'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWaitingList } from '@/contexts/WaitingListContext'
import { useCentralizedBilling } from '@/contexts/CentralizedBillingContext'
import { usePatientRegistry } from '@/contexts/PatientRegistryContext'
import { generateVisitId } from '@/lib/visitIdGenerator'
import { searchPatients, checkPatientByPhone, checkPatientByName } from '@/lib/patientSearch'
import { CheckCircle, X, AlertTriangle } from 'lucide-react'

interface PatientRegistrationModalProps {
  onClose: () => void
  onRegistrationSuccess?: (patientId: string, patientName: string) => void
}

export default function PatientRegistrationModal({ onClose, onRegistrationSuccess }: PatientRegistrationModalProps) {
  const { addPatient, waitingPatients } = useWaitingList()
  const { createInvoice } = useCentralizedBilling()
  const { registerPatient, isNewPatient } = usePatientRegistry()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    emergencyContact: '',
    allergies: '',
    medicalHistory: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isNew, setIsNew] = useState(true)
  const [autoFilled, setAutoFilled] = useState(false)
  const [duplicatePatient, setDuplicatePatient] = useState<{ id: string; name: string; phone: string } | null>(null)
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false)

  // Listen for patient selection from search
  useEffect(() => {
    const handlePatientSelected = (event: CustomEvent) => {
      const patient = event.detail
      if (patient) {
        // Calculate date of birth from age (approximate)
        const today = new Date()
        const birthYear = today.getFullYear() - patient.age
        const dateOfBirth = `${birthYear}-01-01` // Approximate DOB
        
        setFormData({
          firstName: patient.firstName || '',
          lastName: patient.lastName || '',
          dateOfBirth: patient.dateOfBirth || dateOfBirth,
          gender: patient.gender || '',
          phone: patient.phone || '',
          emergencyContact: patient.emergencyContact || '',
          allergies: patient.allergies || '',
          medicalHistory: patient.medicalHistory || '',
        })
        setIsNew(isNewPatient(patient.phone))
        setAutoFilled(true)
      }
    }

    const handlePatientCleared = () => {
      setAutoFilled(false)
    }

    window.addEventListener('patientSelected', handlePatientSelected as EventListener)
    window.addEventListener('patientCleared', handlePatientCleared)

    return () => {
      window.removeEventListener('patientSelected', handlePatientSelected as EventListener)
      window.removeEventListener('patientCleared', handlePatientCleared)
    }
  }, [isNewPatient])

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Calculate age from date of birth
    const age = calculateAge(formData.dateOfBirth)

    // Register patient in registry (handles new/returning logic)
    const patientRecord = registerPatient({
      firstName: formData.firstName,
      lastName: formData.lastName,
      dateOfBirth: formData.dateOfBirth,
      age,
      gender: formData.gender,
      phone: formData.phone,
      email: '', // Removed from form
      address: '', // Removed from form
      emergencyContact: formData.emergencyContact,
      emergencyPhone: '', // Removed from form
      bloodGroup: '', // Removed from form
      allergies: formData.allergies,
      medicalHistory: formData.medicalHistory,
    })

    const patientId = patientRecord.id
    const visitId = generateVisitId() // ZION-YYYYMMDD-XXXX format
    const patientName = `${formData.firstName} ${formData.lastName}`

    // Create Visit record in database so patient appears in Intake Nurse waiting list
    // CORE WORKFLOW: REGISTER -> ASSIGN -> QR.
    // Continue the chain only when backend registration succeeds.
    let intakeRegistrationSucceeded = false
    try {
      const visitResponse = await fetch('/api/intake/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: patientName,
          age,
          phone: formData.phone,
          gender: formData.gender as 'Male' | 'Female' | 'Other',
          department: 'General Clinic' as const,
        }),
      })

      if (visitResponse.ok) {
        const visitData = await visitResponse.json()
        console.log('[Patient Registration] Visit created in database:', visitData)
        intakeRegistrationSucceeded = true
      } else {
        const failData = await visitResponse.json().catch(() => ({}))
        throw new Error(failData?.error || 'Patient registration backend step failed')
      }
    } catch (error) {
      console.error('[Patient Registration] Error creating Visit record:', error)
      setIsSubmitting(false)
      alert('Registration failed. Please try again.')
      return
    }

    // Add patient to waiting list (for doctor's queue) - Use same ID from registry
    // Check if patient already exists in waiting list
    const existingWaitingPatient = waitingPatients.find(p => p.id === patientId || p.phone === formData.phone)
    
    if (!existingWaitingPatient) {
      addPatient({
        id: patientId, // Use the same ID from registry to ensure sync
        firstName: formData.firstName,
        lastName: formData.lastName,
        age,
        gender: formData.gender,
        phone: formData.phone,
        visitId,
      })
    }

    // Auto-create invoice immediately upon registration
    createInvoice(patientId, patientName, visitId)

    if (!intakeRegistrationSucceeded) {
      setIsSubmitting(false)
      alert('Registration was not completed. Please try again.')
      return
    }

    setIsSubmitting(false)
    
    // CORE WORKFLOW: REGISTER -> ASSIGN -> QR
    // If onRegistrationSuccess callback is provided, call it with patient data
    // This allows the parent to redirect to appointment booking seamlessly
    if (onRegistrationSuccess) {
      // CORE WORKFLOW: REGISTER -> ASSIGN -> QR
      // Parent controls transitions:
      // Step 1 close registration -> Step 2 open doctor assignment -> Step 3 open QR
      onRegistrationSuccess(patientId, patientName)
    } else {
      // Default behavior: just close the modal with success message
      const patientType = isNewPatient(formData.phone) ? 'New patient' : 'Returning patient'
      onClose()
      alert(`${patientType} ${formData.firstName} ${formData.lastName} has been registered and added to the waiting list!`)
    }
  }

  // Real-time duplicate check
  const checkForDuplicates = useCallback(async () => {
    if (formData.phone.length >= 3) {
      const phoneMatch = await checkPatientByPhone(formData.phone)
      if (phoneMatch) {
        setDuplicatePatient({
          id: phoneMatch.id,
          name: `${phoneMatch.firstName} ${phoneMatch.lastName}`,
          phone: phoneMatch.phone,
        })
        setShowDuplicateAlert(true)
        return
      }
    }

    if (formData.firstName.length >= 2 && formData.lastName.length >= 2) {
      const nameMatch = await checkPatientByName(formData.firstName, formData.lastName)
      if (nameMatch) {
        setDuplicatePatient({
          id: nameMatch.id,
          name: `${nameMatch.firstName} ${nameMatch.lastName}`,
          phone: nameMatch.phone,
        })
        setShowDuplicateAlert(true)
        return
      }
    }

    setDuplicatePatient(null)
    setShowDuplicateAlert(false)
  }, [formData.phone, formData.firstName, formData.lastName])

  // Debounced duplicate check
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForDuplicates()
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [checkForDuplicates])

  const handleUseExistingPatient = () => {
    if (duplicatePatient) {
      // Use existing patient ID
      onRegistrationSuccess?.(duplicatePatient.id, duplicatePatient.name)
      onClose()
    }
  }

  const handleDismissDuplicate = () => {
    setShowDuplicateAlert(false)
    setDuplicatePatient(null)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass rounded-xl border border-slate-800/50 w-full max-w-5xl max-h-[calc(100vh-150px)] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-800/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-primary">Patient Registration</h2>
            {autoFilled && (
              <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <CheckCircle size={14} className="text-cyan-400" />
                <span className="text-xs text-cyan-400 font-medium">Auto-filled from search</span>
              </div>
            )}
            {!isNew && (
              <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs font-bold">
                Returning Patient
              </span>
            )}
            {isNew && autoFilled && (
              <span className="px-2.5 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs font-bold">
                New Patient
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Duplicate Patient Alert */}
        {showDuplicateAlert && duplicatePatient && (
          <div className="mx-4 mt-4 p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-400 mb-1">
                  Patient already exists
                </p>
                <p className="text-xs text-amber-300/80 mb-3">
                  Found: <strong>{duplicatePatient.name}</strong> (Phone: {duplicatePatient.phone})
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleUseExistingPatient}
                    className="px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 transition-all text-xs font-semibold"
                  >
                    Use Existing Profile
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissDuplicate}
                    className="px-4 py-2 bg-slate-800/50 text-slate-300 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-all text-xs font-medium"
                  >
                    Continue as New
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 pb-6 flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 overflow-y-auto min-h-0 pr-2">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Date of Birth *
              </label>
              <input
                type="date"
                name="dateOfBirth"
                required
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Gender *
              </label>
              <select
                name="gender"
                required
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Emergency Contact
              </label>
              <input
                type="text"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Allergies
              </label>
              <textarea
                name="allergies"
                value={formData.allergies}
                onChange={handleChange}
                placeholder="List any known allergies"
                rows={2}
                className="w-full px-3 py-2 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 resize-none transition-all"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Medical History
              </label>
              <textarea
                name="medicalHistory"
                value={formData.medicalHistory}
                onChange={handleChange}
                rows={3}
                placeholder="Previous medical conditions, surgeries, etc."
                className="w-full px-3 py-2 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 resize-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/50 mt-auto flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800/50 text-slate-300 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-all text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-cyan-500 text-white border border-cyan-500/20 rounded-lg hover:bg-cyan-600 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Registering...' : 'Register Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

