'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, User, AlertCircle, CheckCircle, X } from 'lucide-react'
import { useAppointments } from '@/contexts/AppointmentsContext'
import { useWaitingList } from '@/contexts/WaitingListContext'
import { useCentralizedBilling } from '@/contexts/CentralizedBillingContext'
import { generateVisitId } from '@/lib/visitIdGenerator'
import { lockSlot, unlockSlot, isSlotLocked } from '@/lib/slotLocking'
import { useAuth } from '@/contexts/AuthContext'
import VisitQRModal from './VisitQRModal'

interface AppointmentBookingModalProps {
  onClose: () => void
  patientId?: string
  patientName?: string
  onRegistrationReset?: () => void // Callback to reset registration form
  onBookingSuccess?: (data: {
    patientId: string
    patientName: string
    visitId: string
    doctorName: string
    department: string
    appointmentDate: string
    appointmentTime: string
    queueNumber: number
  }) => void
}

// Mock doctors list - In production, fetch from database
const DOCTORS = [
  { id: 'DOC-1', name: 'Dr. Smith', specialization: 'General Medicine' },
  { id: 'DOC-2', name: 'Dr. Johnson', specialization: 'Cardiology' },
  { id: 'DOC-3', name: 'Dr. Williams', specialization: 'Pediatrics' },
]

export default function AppointmentBookingModal({
  onClose,
  patientId,
  patientName,
  onRegistrationReset,
  onBookingSuccess,
}: AppointmentBookingModalProps) {
  const { createAppointment, checkDoctorAvailability, getDoctorDailyCount, appointments } = useAppointments()
  const { waitingPatients } = useWaitingList()
  const { createInvoice } = useCentralizedBilling()
  const { user } = useAuth()

  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState('')
  const [availabilityStatus, setAvailabilityStatus] = useState<{ available: boolean; reason?: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFollowUp, setIsFollowUp] = useState(false) // Follow-up visit flag
  
  // QR Modal state
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrModalData, setQrModalData] = useState<{
    visitId: string
    patientName: string
    doctorName: string
    appointmentDate: string
    appointmentTime: string
    queueNumber: number
  } | null>(null)

  // Generate time slots (9 AM to 5 PM, every 30 minutes)
  const timeSlots = Array.from({ length: 17 }, (_, i) => {
    const hour = 9 + Math.floor(i / 2)
    const minute = i % 2 === 0 ? '00' : '30'
    return `${hour.toString().padStart(2, '0')}:${minute}`
  })

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]

  // Check availability when doctor, date, or time changes
  useEffect(() => {
    if (selectedDoctor && appointmentDate && appointmentTime) {
      const availability = checkDoctorAvailability(selectedDoctor, appointmentDate, appointmentTime)
      setAvailabilityStatus(availability)
    } else {
      setAvailabilityStatus(null)
    }
  }, [selectedDoctor, appointmentDate, appointmentTime, checkDoctorAvailability])

  // Get doctor daily count
  const doctorDailyCount = selectedDoctor && appointmentDate ? getDoctorDailyCount(selectedDoctor, appointmentDate) : 0

  // Check if doctor is currently busy
  const isDoctorBusy = selectedDoctor
    ? appointments.some(
        (apt) => apt.doctorId === selectedDoctor && apt.status === 'In_Progress'
      )
    : false

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedDoctor || !appointmentDate || !appointmentTime) {
      alert('Please fill in all fields')
      return
    }

    if (!availabilityStatus?.available) {
      alert(availabilityStatus?.reason || 'This time slot is not available')
      return
    }

    setIsSubmitting(true)

    // Lock the slot before booking
    const userId = user?.id || 'unknown'
    if (!lockSlot(selectedDoctor, appointmentDate, appointmentTime, userId)) {
      alert('⚠️ This slot was just taken. Please choose another time.')
      setIsSubmitting(false)
      return
    }

    try {
      // Get patient info
      let finalPatientId = patientId
      let finalPatientName = patientName

      if (!finalPatientId || !finalPatientName) {
        // If no patient selected, use first waiting patient or create new
        const firstWaiting = waitingPatients.find((p) => p.status === 'Waiting')
        if (firstWaiting) {
          finalPatientId = firstWaiting.id
          finalPatientName = `${firstWaiting.firstName} ${firstWaiting.lastName}`
        } else {
          alert('Please select a patient first')
          unlockSlot(selectedDoctor, appointmentDate, appointmentTime)
          setIsSubmitting(false)
          return
        }
      }

      const selectedDoctorData = DOCTORS.find((doc) => doc.id === selectedDoctor)

      // Create appointment
      const result = createAppointment({
        patientId: finalPatientId,
        patientName: finalPatientName,
        doctorId: selectedDoctor,
        doctorName: selectedDoctorData?.name || 'Unknown Doctor',
        appointmentDate,
        appointmentTime,
      })

      if (result.success) {
        // Generate standardized Visit ID (ZION-YYYYMMDD-XXXX format)
        const visitId = generateVisitId()
        
        // Extract queue number from Visit ID (last 4 digits)
        const queueNumberMatch = visitId.match(/-(\d{4})$/)
        const queueNumber = queueNumberMatch ? parseInt(queueNumberMatch[1], 10) : 0
        
        // Create pending invoice with this Visit ID (Booking-to-Invoice Link)
        createInvoice(finalPatientId, finalPatientName, visitId)
        
        // Create pending invoice in database (non-blocking; don't freeze QR modal)
        try {
          const controller = new AbortController()
          const t = setTimeout(() => controller.abort(), 2500)
          fetch('/api/billing/invoice/create-pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              visitId,
              patientId: finalPatientId,
              patientName: finalPatientName,
              status: 'Pending',
              isFollowUp, // Pass follow-up flag
            }),
            signal: controller.signal,
          })
            .catch((error) => {
              console.error('Error creating pending invoice:', error)
            })
            .finally(() => clearTimeout(t))
        } catch (error) {
          console.error('Error creating pending invoice:', error)
        }
        
        console.log(`[Appointment Booking] Visit ID created: ${visitId} for patient: ${finalPatientName}`)
        console.log(`[Appointment Booking] Pending invoice created - Accountant can see patient as 'In Progress'`)

        // CORE WORKFLOW: REGISTER -> ASSIGN -> QR
        // Immediately trigger QR/Print flow in parent when provided.
        if (onBookingSuccess) {
          // CORE WORKFLOW: REGISTER -> ASSIGN -> QR
          onBookingSuccess({
            patientId: finalPatientId,
            patientName: finalPatientName,
            visitId,
            doctorName: selectedDoctorData?.name || 'Unknown Doctor',
            department: selectedDoctorData?.specialization || 'General Clinic',
            appointmentDate,
            appointmentTime,
            queueNumber,
          })
          setIsSubmitting(false)
          onClose()
          return
        }

        // Fallback: internal QR modal (legacy)
        setQrModalData({
          visitId,
          patientName: finalPatientName,
          doctorName: selectedDoctorData?.name || 'Unknown Doctor',
          appointmentDate,
          appointmentTime,
          queueNumber,
        })
        setShowQRModal(true)
        setIsSubmitting(false)
      } else {
        unlockSlot(selectedDoctor, appointmentDate, appointmentTime)
        alert(result.message)
        setIsSubmitting(false)
      }
    } catch (error) {
      unlockSlot(selectedDoctor, appointmentDate, appointmentTime)
      console.error('Error booking appointment:', error)
      alert('An error occurred. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleQRModalDone = () => {
    setShowQRModal(false)
    setQrModalData(null)
    onClose()
    // Reset registration form if callback provided
    if (onRegistrationReset) {
      onRegistrationReset()
    }
  }

  const handleQRModalClose = () => {
    setShowQRModal(false)
    setQrModalData(null)
  }

  return (
    <>
      {showQRModal && qrModalData && (
        <VisitQRModal
          visitId={qrModalData.visitId}
          patientName={qrModalData.patientName}
          doctorName={qrModalData.doctorName}
          appointmentDate={qrModalData.appointmentDate}
          appointmentTime={qrModalData.appointmentTime}
          queueNumber={qrModalData.queueNumber}
          onClose={handleQRModalClose}
          onDone={handleQRModalDone}
        />
      )}
      
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass rounded-xl border border-slate-800/50 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 border-b border-slate-800/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Calendar size={20} className="text-cyan-400" />
            <h2 className="text-lg font-semibold text-primary">Book Appointment</h2>
          </div>
          <button
            onClick={onClose}
            className="text-secondary hover:text-primary text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Patient Info - Auto-selected from Registration */}
          {patientName && patientId && (
            <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-400" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-300">Patient Pre-Selected</p>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
                    {patientName} (ID: {patientId.slice(-8)})
                  </p>
                  <p className="text-[10px] text-emerald-300/60 mt-1">
                    ✓ Automatically selected from registration
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Doctor Selection */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">Select Doctor *</label>
            <select
              value={selectedDoctor}
              onChange={(e) => {
                setSelectedDoctor(e.target.value)
                setAppointmentTime('')
              }}
              required
              className="w-full px-4 py-3 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
            >
              <option value="">Choose a doctor...</option>
              {DOCTORS.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} - {doctor.specialization}
                </option>
              ))}
            </select>
          </div>

          {/* Doctor Status Indicators */}
          {selectedDoctor && appointmentDate && (
            <div className="space-y-2">
              {/* Daily Count */}
              <div className="p-3 bg-slate-900/30 border border-slate-800/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-secondary">Appointments Today</span>
                  <span className={`text-sm font-semibold ${doctorDailyCount >= 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {doctorDailyCount} / 10
                  </span>
                </div>
                {doctorDailyCount >= 10 && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Daily limit reached for this doctor
                  </p>
                )}
              </div>

              {/* Busy Indicator */}
              {isDoctorBusy && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-xs text-amber-400 flex items-center gap-2">
                    <AlertCircle size={12} />
                    Doctor is currently with a patient
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">Appointment Date *</label>
            <input
              type="date"
              value={appointmentDate}
              onChange={(e) => {
                setAppointmentDate(e.target.value)
                setAppointmentTime('')
              }}
              min={today}
              required
              className="w-full px-4 py-3 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
            />
          </div>

          {/* Time Selection */}
          {appointmentDate && (
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">Appointment Time *</label>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-900/30 rounded-lg border border-slate-800/50">
                {timeSlots.map((time) => {
                  const availability = selectedDoctor && appointmentDate
                    ? checkDoctorAvailability(selectedDoctor, appointmentDate, time)
                    : { available: true }
                  
                  const isAvailable = availability.available
                  
                  // Check if slot is locked
                  const slotLocked = selectedDoctor && appointmentDate
                    ? isSlotLocked(selectedDoctor, appointmentDate, time)
                    : false
                  
                  // Check if doctor is currently with a patient at this time
                  const isCurrentPatient = selectedDoctor && appointmentDate
                    ? appointments.some(
                        (apt) =>
                          apt.doctorId === selectedDoctor &&
                          apt.appointmentDate === appointmentDate &&
                          apt.appointmentTime === time &&
                          apt.status === 'In_Progress'
                      )
                    : false
                  
                  // Determine slot status and color
                  let slotStatus: 'available' | 'booked' | 'current' | 'locked' = 'available'
                  if (isCurrentPatient) {
                    slotStatus = 'current'
                  } else if (!isAvailable || slotLocked) {
                    slotStatus = slotLocked ? 'locked' : 'booked'
                  }

                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => {
                        if (slotLocked) {
                          alert('⚠️ This slot was just taken. Please choose another time.')
                          return
                        }
                        setAppointmentTime(time)
                      }}
                      disabled={!isAvailable || slotLocked}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        appointmentTime === time
                          ? 'bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500/40'
                          : slotStatus === 'available'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50'
                          : slotStatus === 'current'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : slotStatus === 'locked'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-not-allowed animate-pulse'
                          : 'bg-slate-900/30 text-slate-600 border border-slate-800/30 cursor-not-allowed opacity-50'
                      }`}
                      title={
                        slotStatus === 'available'
                          ? 'Available'
                          : slotStatus === 'current'
                          ? 'Current patient in the room'
                          : slotStatus === 'locked'
                          ? 'This slot was just taken'
                          : 'Booked'
                      }
                    >
                      {time}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Availability Status */}
          {availabilityStatus && (
            <div
              className={`p-4 rounded-lg border ${
                availabilityStatus.available
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-rose-500/10 border-rose-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                {availabilityStatus.available ? (
                  <CheckCircle size={18} className="text-emerald-400" />
                ) : (
                  <AlertCircle size={18} className="text-rose-400" />
                )}
                <p
                  className={`text-sm font-medium ${
                    availabilityStatus.available ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {availabilityStatus.available ? 'Time slot available' : availabilityStatus.reason}
                </p>
              </div>
            </div>
          )}

          </div>

          {/* Fixed Submit Button Area */}
          <div className="flex-shrink-0 p-6 pt-4 border-t border-slate-800/50 bg-slate-900/30">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 bg-slate-800/50 text-slate-300 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-all text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!availabilityStatus?.available || isSubmitting || doctorDailyCount >= 10}
                className="px-5 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 rounded-lg hover:bg-cyan-500/30 hover:border-cyan-500/50 transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400 border-t-transparent"></div>
                    <span>Booking...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    <span>Confirm Appointment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    </>
  )
}

