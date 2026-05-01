'use client'

import { useState, useEffect } from 'react'
import { X, Calendar, FileText, Pill, Activity, AlertCircle, Edit2, Save, XCircle } from 'lucide-react'
import { useVisitData } from '@/contexts/VisitDataContext'
import { usePatientRegistry } from '@/contexts/PatientRegistryContext'

interface MedicalRecordModalProps {
  patient: any
  onClose: () => void
}

export default function MedicalRecordModal({ patient, onClose }: MedicalRecordModalProps) {
  const { getVisitData } = useVisitData()
  const { getPatientById, getPatientByPhone, updatePatient, patients } = usePatientRegistry()
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentPatient, setCurrentPatient] = useState<any>(null) // Local state for patient data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    age: 0,
    gender: '',
    bloodGroup: '',
    allergies: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Get full patient data from registry - ALWAYS get fresh data
  const fullPatient = getPatientById(patient.id)
  
  // Get visit history
  const visitData = getVisitData(patient.id)
  
      // Sync currentPatient with registry data - FORCE UPDATE
      // Try multiple methods to find the patient
      useEffect(() => {
        // First try by ID
        let latest = getPatientById(patient.id)
        
        // If not found by ID, try by phone
        if (!latest && patient.phone) {
          console.log('⚠️ Patient not found by ID, trying phone:', patient.phone)
          latest = getPatientByPhone(patient.phone)
        }
        
        // If still not found, try by name
        if (!latest && patient.firstName && patient.lastName) {
          console.log('⚠️ Patient not found by phone, trying name:', patient.firstName, patient.lastName)
          latest = patients.find(p => 
            p.firstName.toLowerCase() === patient.firstName.toLowerCase() &&
            p.lastName.toLowerCase() === patient.lastName.toLowerCase()
          )
        }
        
        if (latest) {
          console.log('✅ Syncing currentPatient with registry:', latest)
          setCurrentPatient(latest)
        } else {
          console.log('⚠️ No registry data found, using patient prop:', patient)
          console.log('📋 Available patients:', patients.map(p => ({
            id: p.id,
            name: `${p.firstName} ${p.lastName}`,
            phone: p.phone
          })))
          setCurrentPatient(patient)
        }
      }, [patient, patient.id, patient.phone, patient.firstName, patient.lastName, patients, getPatientById, getPatientByPhone]) // Watch all relevant fields
  
  // Debug: Log patient ID and updates
  useEffect(() => {
    console.log('🔍 MedicalRecordModal - Patient ID:', patient.id)
    console.log('🔍 MedicalRecordModal - Current Patient:', currentPatient)
    console.log('🔍 MedicalRecordModal - Full Patient from Registry:', fullPatient)
    console.log('🔍 MedicalRecordModal - Patients Array Length:', patients.length)
  }, [patient.id, currentPatient, fullPatient, patients.length])

  // Initialize form data when patient data is loaded or updated - STRICT SYNC
  useEffect(() => {
    // Use currentPatient (which is synced with registry) or fallback to patient prop
    const source = currentPatient || fullPatient || patient
    
    if (source) {
      console.log('✅ Updating formData from source:', source)
      const newFormData = {
        firstName: source.firstName || '',
        lastName: source.lastName || '',
        phone: source.phone || '',
        age: source.age || 0,
        gender: source.gender || '',
        bloodGroup: source.bloodGroup || '',
        allergies: source.allergies || '',
      }
      setFormData(newFormData)
      console.log('✅ FormData updated:', newFormData)
    }
  }, [currentPatient, fullPatient, patient]) // Watch all patient sources

  // Validation functions
  const validatePhone = (phone: string): boolean => {
    // Accept Iraqi phone format: 07XXXXXXXXX or 0750XXXXXXX
    const phoneRegex = /^07\d{9,10}$/
    return phoneRegex.test(phone.replace(/\s+/g, ''))
  }

  const validateAge = (age: number): boolean => {
    return age >= 0 && age <= 150
  }

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleSave = async () => {
    // Validate all fields
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }
    if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Invalid phone number format (must be 07XXXXXXXXX)'
    }
    if (!validateAge(formData.age)) {
      newErrors.age = 'Age must be between 0 and 150'
    }
    if (!formData.gender) {
      newErrors.gender = 'Gender is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSaving(true)
    
    // Define updates outside try block so it's accessible in catch block
    const updates = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      phone: formData.phone.trim(),
      age: formData.age,
      gender: formData.gender,
      bloodGroup: formData.bloodGroup || '',
      allergies: formData.allergies || '',
    }

    console.log('💾 Saving patient data:', {
      patientId: patient.id,
      updates
    })

    try {
      // CRITICAL: Re-fetch patient by Phone or Name to get the REAL, current ID from database
      let actualPatientId = patient.id
      let actualPatient = getPatientById(patient.id)
      
      // If patient not found by ID, try to find by phone
      if (!actualPatient && updates.phone) {
        console.log('⚠️ Patient not found by ID, searching by phone:', updates.phone)
        actualPatient = getPatientByPhone(updates.phone)
        if (actualPatient) {
          actualPatientId = actualPatient.id
          console.log('✅ Found patient by phone, using ID:', actualPatientId)
        }
      }
      
      // If still not found, try to find by name
      if (!actualPatient && updates.firstName && updates.lastName) {
        console.log('⚠️ Patient not found by phone, searching by name:', updates.firstName, updates.lastName)
        actualPatient = patients.find(p => 
          p.firstName.toLowerCase() === updates.firstName.toLowerCase() &&
          p.lastName.toLowerCase() === updates.lastName.toLowerCase()
        )
        if (actualPatient) {
          actualPatientId = actualPatient.id
          console.log('✅ Found patient by name, using ID:', actualPatientId)
        }
      }
      
      // Log all available IDs for debugging
      console.log('📋 Available Patient IDs in registry:', patients.map(p => ({
        id: p.id,
        name: `${p.firstName} ${p.lastName}`,
        phone: p.phone
      })))
      
      // Final check: if still not found, show error with available IDs
      if (!actualPatient) {
        const availableIds = patients.map(p => p.id).join(', ')
        const errorMsg = `Patient not found in registry.\n\nDisplayed ID: ${patient.id}\n\nAvailable IDs: ${availableIds || 'None'}\n\nPlease check the patient data.`
        console.error('❌', errorMsg)
        throw new Error(errorMsg)
      }
      
      console.log('✅ Using actual patient ID for update:', actualPatientId)
      console.log('✅ Actual patient data:', {
        id: actualPatient.id,
        firstName: actualPatient.firstName,
        lastName: actualPatient.lastName,
        phone: actualPatient.phone
      })

      // Update patient in registry using the REAL ID - AWAIT the Promise to ensure completion
      console.log('⏳ Calling updatePatient with REAL ID:', actualPatientId)
      await updatePatient(actualPatientId, updates)
      console.log('✅ updatePatient Promise resolved')

      // CRITICAL: Wait for React state to update and localStorage to be saved
      // Use multiple checks to ensure the update is complete
      // Use the REAL ID for verification
      let updatedPatient = null
      let attempts = 0
      const maxAttempts = 20 // Increased attempts

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 50))
        updatedPatient = getPatientById(actualPatientId) // Use REAL ID
        
        if (updatedPatient) {
          // Verify the update actually happened - check at least one field
          const hasUpdate = (
            updatedPatient.firstName === updates.firstName ||
            updatedPatient.phone === updates.phone ||
            updatedPatient.age === updates.age ||
            updatedPatient.bloodGroup === updates.bloodGroup
          )
          
          if (hasUpdate) {
            console.log(`✅ Update verified after ${attempts + 1} attempts`)
            break
          }
        }
        attempts++
        console.log(`⏳ Waiting for update... attempt ${attempts}/${maxAttempts}`)
      }

      if (!updatedPatient) {
        console.error('❌ Failed to retrieve updated patient after', maxAttempts, 'attempts')
        // Try one more time with fresh data using REAL ID
        updatedPatient = getPatientById(actualPatientId)
        if (!updatedPatient) {
          throw new Error(`Failed to retrieve updated patient data after ${maxAttempts} attempts. Real Patient ID: ${actualPatientId}, Displayed ID: ${patient.id}`)
        }
      }

      console.log('✅ Updated patient from registry:', updatedPatient)
      console.log('✅ New Data in UI:', {
        firstName: updatedPatient.firstName,
        lastName: updatedPatient.lastName,
        phone: updatedPatient.phone,
        age: updatedPatient.age,
        gender: updatedPatient.gender,
        bloodGroup: updatedPatient.bloodGroup,
        allergies: updatedPatient.allergies,
      })

      // FORCE UPDATE: Update currentPatient state to trigger re-render
      setCurrentPatient(updatedPatient)
      
      // FORCE UPDATE: Update formData immediately with saved values
      setFormData({
        firstName: updatedPatient.firstName,
        lastName: updatedPatient.lastName,
        phone: updatedPatient.phone,
        age: updatedPatient.age,
        gender: updatedPatient.gender,
        bloodGroup: updatedPatient.bloodGroup || '',
        allergies: updatedPatient.allergies || '',
      })

      // Exit edit mode AFTER data is confirmed updated
      setIsEditMode(false)
      setErrors({})
      
      // Show success message
      alert('✅ Patient information updated successfully!')
      
      // Trigger a custom event to refresh search results if needed
      window.dispatchEvent(new CustomEvent('patientUpdated', { detail: { patientId: patient.id, updatedPatient } }))
    } catch (error: any) {
      console.error('❌ Error updating patient:', error)
      console.error('❌ Error details:', {
        message: error?.message,
        stack: error?.stack,
        patientId: patient.id,
        updates
      })
      
      // Show detailed error message
      const errorMsg = error?.message || 'Unknown error occurred'
      alert(`❌ Failed to update patient information.\n\nError: ${errorMsg}\n\nPatient ID: ${patient.id}\n\nPlease check the console for more details.`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset form data to original values
    if (fullPatient) {
      setFormData({
        firstName: fullPatient.firstName || patient.firstName || '',
        lastName: fullPatient.lastName || patient.lastName || '',
        phone: fullPatient.phone || patient.phone || '',
        age: fullPatient.age || patient.age || 0,
        gender: fullPatient.gender || patient.gender || '',
        bloodGroup: fullPatient.bloodGroup || '',
        allergies: fullPatient.allergies || '',
      })
    } else {
      setFormData({
        firstName: patient.firstName || '',
        lastName: patient.lastName || '',
        phone: patient.phone || '',
        age: patient.age || 0,
        gender: patient.gender || '',
        bloodGroup: '',
        allergies: '',
      })
    }
    setIsEditMode(false)
    setErrors({})
  }

  // Extract chronic diseases from medical history
  const chronicDiseases = fullPatient?.medicalHistory 
    ? fullPatient.medicalHistory.split(/[,\u060C]/).filter(d => d.trim() && d.trim() !== 'None').map(d => d.trim())
    : []

  // Get last prescription
  const lastPrescription = visitData?.prescription || 'No prescriptions recorded'

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass rounded-xl border border-slate-800/50 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <FileText size={24} className="text-cyan-400" />
            <div>
              <h2 className="text-lg font-semibold text-primary">Medical Record</h2>
              <p className="text-xs text-secondary mt-0.5">
                {isEditMode ? formData.firstName + ' ' + formData.lastName : (currentPatient?.firstName || patient.firstName) + ' ' + (currentPatient?.lastName || patient.lastName)} • ID: {patient.id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditMode && (
              <button
                onClick={() => setIsEditMode(true)}
                className="px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/15 transition-all flex items-center gap-2 text-sm font-medium"
              >
                <Edit2 size={16} />
                <span>Edit Profile</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-secondary hover:text-primary text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Patient Info Summary */}
          <div className={`glass rounded-lg border p-3 transition-all ${isEditMode ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-slate-800/50'}`}>
            <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
              <Activity size={16} className="text-cyan-400" />
              Patient Information
              {isEditMode && (
                <span className="text-xs text-cyan-400 font-normal">(Editing Mode)</span>
              )}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {/* Row 1: First Name | Last Name */}
              <div>
                <label className="text-secondary block mb-0.5 text-xs">First Name:</label>
                {isEditMode ? (
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className={`w-full px-2.5 py-1.5 bg-slate-900/50 border rounded-lg text-primary text-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.firstName 
                        ? 'border-rose-500/50 focus:ring-rose-500/30 focus:border-rose-500' 
                        : 'border-cyan-500/30 focus:ring-cyan-500/30 focus:border-cyan-500'
                    }`}
                    placeholder="First Name"
                  />
                ) : (
                  <span className="text-primary text-sm">{formData.firstName || currentPatient?.firstName || patient.firstName}</span>
                )}
                {errors.firstName && (
                  <p className="text-xs text-rose-400 mt-0.5">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="text-secondary block mb-0.5 text-xs">Last Name:</label>
                {isEditMode ? (
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className={`w-full px-2.5 py-1.5 bg-slate-900/50 border rounded-lg text-primary text-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.lastName 
                        ? 'border-rose-500/50 focus:ring-rose-500/30 focus:border-rose-500' 
                        : 'border-cyan-500/30 focus:ring-cyan-500/30 focus:border-cyan-500'
                    }`}
                    placeholder="Last Name"
                  />
                ) : (
                  <span className="text-primary text-sm">{formData.lastName || currentPatient?.lastName || patient.lastName}</span>
                )}
                {errors.lastName && (
                  <p className="text-xs text-rose-400 mt-0.5">{errors.lastName}</p>
                )}
              </div>

              {/* Row 2: Age | Gender */}
              <div>
                <label className="text-secondary block mb-0.5 text-xs">Age:</label>
                {isEditMode ? (
                  <input
                    type="number"
                    min="0"
                    max="150"
                    value={formData.age}
                    onChange={(e) => handleInputChange('age', parseInt(e.target.value) || 0)}
                    className={`w-full px-2.5 py-1.5 bg-slate-900/50 border rounded-lg text-primary text-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.age 
                        ? 'border-rose-500/50 focus:ring-rose-500/30 focus:border-rose-500' 
                        : 'border-cyan-500/30 focus:ring-cyan-500/30 focus:border-cyan-500'
                    }`}
                    placeholder="Age"
                  />
                ) : (
                  <span className="text-primary text-sm">{formData.age || currentPatient?.age || patient.age} years</span>
                )}
                {errors.age && (
                  <p className="text-xs text-rose-400 mt-0.5">{errors.age}</p>
                )}
              </div>

              <div>
                <label className="text-secondary block mb-0.5 text-xs">Gender:</label>
                {isEditMode ? (
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className={`w-full px-2.5 py-1.5 bg-slate-900/50 border rounded-lg text-primary text-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.gender 
                        ? 'border-rose-500/50 focus:ring-rose-500/30 focus:border-rose-500' 
                        : 'border-cyan-500/30 focus:ring-cyan-500/30 focus:border-cyan-500'
                    }`}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                ) : (
                  <span className="text-primary text-sm">{formData.gender || currentPatient?.gender || patient.gender}</span>
                )}
                {errors.gender && (
                  <p className="text-xs text-rose-400 mt-0.5">{errors.gender}</p>
                )}
              </div>

              {/* Row 3: Phone | Blood Group */}
              <div>
                <label className="text-secondary block mb-0.5 text-xs">Phone:</label>
                {isEditMode ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className={`w-full px-2.5 py-1.5 bg-slate-900/50 border rounded-lg text-primary text-sm focus:outline-none focus:ring-2 transition-all ${
                      errors.phone 
                        ? 'border-rose-500/50 focus:ring-rose-500/30 focus:border-rose-500' 
                        : 'border-cyan-500/30 focus:ring-cyan-500/30 focus:border-cyan-500'
                    }`}
                    placeholder="07XXXXXXXXX"
                  />
                ) : (
                  <span className="text-primary text-sm">{formData.phone || currentPatient?.phone || patient.phone}</span>
                )}
                {errors.phone && (
                  <p className="text-xs text-rose-400 mt-0.5">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="text-secondary block mb-0.5 text-xs">Blood Group:</label>
                {isEditMode ? (
                  <select
                    value={formData.bloodGroup}
                    onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all"
                  >
                    <option value="">Not recorded</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                ) : (
                  <span className="text-primary text-sm">{formData.bloodGroup || currentPatient?.bloodGroup || fullPatient?.bloodGroup || 'Not recorded'}</span>
                )}
              </div>

              {/* Allergies - Spans both columns */}
              {(isEditMode || (fullPatient?.allergies && fullPatient.allergies !== 'None')) && (
                <div className="col-span-2">
                  <label className="text-secondary block mb-0.5 text-xs">Allergies:</label>
                  {isEditMode ? (
                    <textarea
                      value={formData.allergies}
                      onChange={(e) => handleInputChange('allergies', e.target.value)}
                      rows={2}
                      className="w-full px-2.5 py-1.5 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all resize-none"
                      placeholder="Enter allergies or 'None'"
                    />
                  ) : (
                    <span className="text-rose-400 font-medium text-sm">{formData.allergies || fullPatient?.allergies}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chronic Diseases */}
          {chronicDiseases.length > 0 && (
            <div className="glass rounded-lg border border-amber-500/30 p-3 bg-amber-500/5">
              <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-400" />
                Chronic Diseases
              </h3>
              <div className="flex flex-wrap gap-2">
                {chronicDiseases.map((disease, index) => (
                  <span
                    key={index}
                    className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-medium"
                  >
                    {disease}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Visit History */}
          <div className="glass rounded-lg border border-slate-800/50 p-3">
            <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
              <Calendar size={16} className="text-cyan-400" />
              Visit History
            </h3>
            {visitData ? (
              <div className="space-y-3">
                <div className="border-l-2 border-cyan-500/50 pl-4 py-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-secondary">Last Visit</span>
                    <span className="text-xs text-secondary">
                      {new Date(visitData.completedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  {visitData.diagnosis && (
                    <div className="mt-2">
                      <span className="text-xs text-secondary">Diagnosis:</span>
                      <p className="text-sm text-primary mt-1">{visitData.diagnosis}</p>
                    </div>
                  )}
                  {visitData.labTests && visitData.labTests.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-secondary">Lab Tests:</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {visitData.labTests.map((test, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-800/50 text-slate-300 rounded text-xs"
                          >
                            {test.specificTestName || test.testType}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-secondary">No previous visits recorded</p>
            )}
            {fullPatient && fullPatient.visitCount > 0 && (
              <p className="text-xs text-secondary mt-3">
                Total Visits: <span className="text-primary font-medium">{fullPatient.visitCount}</span>
              </p>
            )}
          </div>

          {/* Last Prescription */}
          {lastPrescription && lastPrescription !== 'No prescriptions recorded' && (
            <div className="glass rounded-lg border border-slate-800/50 p-3">
              <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <Pill size={16} className="text-emerald-400" />
                Last Prescription
              </h3>
              <div className="bg-slate-900/30 rounded-lg p-2.5 border border-slate-800/50">
                <p className="text-sm text-primary whitespace-pre-wrap">{lastPrescription}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed at bottom with Save/Cancel buttons (only in edit mode) */}
        {isEditMode && (
          <div className="border-t border-slate-800/50 bg-slate-900/50 p-4 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-800/50 text-slate-300 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-all flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle size={16} />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/15 transition-all flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

