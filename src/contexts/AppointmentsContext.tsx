'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

/**
 * APPOINTMENTS CONTEXT - DATA SEPARATION RULE
 * 
 * This context manages APPOINTMENTS (Planning & Limits) - SEPARATE from Revenue/Invoices.
 * 
 * Rule 1: Appointments Table is COMPLETELY SEPARATE from Revenue Table
 * - Appointments = Planning & Scheduling (doesn't affect money yet)
 * - Invoices = Actual Revenue (this is what Manager Reports read)
 * 
 * Rule 2: The 10-Patient Daily Limit is checked ONLY against Appointments Table
 * - If 10 slots are filled (whether paid or not), booking is locked for that doctor
 * - This limit is independent of payment status
 */

export type AppointmentStatus = 'Scheduled' | 'In_Progress' | 'Completed' | 'Cancelled' | 'No_Show'
export type DoctorAvailability = 'Available' | 'Busy' | 'Limit_Reached' | 'Off_Duty'

export interface Appointment {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  appointmentDate: string // ISO date string
  appointmentTime: string // HH:mm format
  status: AppointmentStatus
  createdAt: string
  reminderSent?: boolean
  noShowAt?: string
}

interface AppointmentsContextType {
  appointments: Appointment[]
  createAppointment: (appointment: Omit<Appointment, 'id' | 'status' | 'createdAt' | 'reminderSent'>) => { success: boolean; message: string }
  updateAppointmentStatus: (appointmentId: string, status: AppointmentStatus) => void
  getAppointmentsByDoctor: (doctorId: string, date: string) => Appointment[]
  getAppointmentsByDate: (date: string) => Appointment[]
  checkDoctorAvailability: (doctorId: string, date: string, time: string) => { available: boolean; reason?: string }
  getDoctorDailyCount: (doctorId: string, date: string) => number
  markNoShow: (appointmentId: string) => void
  getUpcomingAppointments: (minutes: number) => Appointment[]
}

const AppointmentsContext = createContext<AppointmentsContextType | undefined>(undefined)

const DAILY_PATIENT_LIMIT = 10

export function AppointmentsProvider({ children }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zionmed_appointments')
      if (saved) {
        return JSON.parse(saved)
      }
    }
    return []
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zionmed_appointments', JSON.stringify(appointments))
    }
  }, [appointments])

  const createAppointment = (
    appointmentData: Omit<Appointment, 'id' | 'status' | 'createdAt' | 'reminderSent'>
  ): { success: boolean; message: string } => {
    const { doctorId, appointmentDate, appointmentTime } = appointmentData

    // Check daily limit
    const dailyCount = getDoctorDailyCount(doctorId, appointmentDate)
    if (dailyCount >= DAILY_PATIENT_LIMIT) {
      return {
        success: false,
        message: `Daily limit reached for this doctor. Maximum ${DAILY_PATIENT_LIMIT} appointments per day.`,
      }
    }

    // Check for double booking
    const existingAppointment = appointments.find(
      (apt) =>
        apt.doctorId === doctorId &&
        apt.appointmentDate === appointmentDate &&
        apt.appointmentTime === appointmentTime &&
        apt.status !== 'Cancelled' &&
        apt.status !== 'No_Show'
    )

    if (existingAppointment) {
      return {
        success: false,
        message: 'This time slot is already booked. Please choose another time.',
      }
    }

    // Check if doctor is currently busy
    const doctorBusyAppointment = appointments.find(
      (apt) => apt.doctorId === doctorId && apt.status === 'In_Progress'
    )

    if (doctorBusyAppointment) {
      // Allow booking but warn
      console.warn('Doctor is currently with a patient')
    }

    const newAppointment: Appointment = {
      ...appointmentData,
      id: `APT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'Scheduled',
      createdAt: new Date().toISOString(),
      reminderSent: false,
    }

    setAppointments((prev) => [...prev, newAppointment])

    return {
      success: true,
      message: 'Appointment scheduled successfully!',
    }
  }

  const updateAppointmentStatus = (appointmentId: string, status: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === appointmentId ? { ...apt, status, updatedAt: new Date().toISOString() } : apt))
    )
  }

  const getAppointmentsByDoctor = (doctorId: string, date: string): Appointment[] => {
    return appointments.filter(
      (apt) => apt.doctorId === doctorId && apt.appointmentDate === date && apt.status !== 'Cancelled'
    )
  }

  const getAppointmentsByDate = (date: string): Appointment[] => {
    return appointments.filter((apt) => apt.appointmentDate === date)
  }

  /**
   * Check doctor availability for a specific date and time
   * 
   * Rule 2: Checks ONLY the Appointments Table (not invoices/revenue)
   * - Daily limit (10 patients) is checked against appointments count
   * - Double booking is checked against appointments
   * - Payment status does NOT affect availability check
   */
  const checkDoctorAvailability = (
    doctorId: string,
    date: string,
    time: string
  ): { available: boolean; reason?: string } => {
    // Check daily limit - Rule 2: Only checks Appointments Table
    const dailyCount = getDoctorDailyCount(doctorId, date)
    if (dailyCount >= DAILY_PATIENT_LIMIT) {
      return {
        available: false,
        reason: `Daily limit reached for this doctor. Maximum ${DAILY_PATIENT_LIMIT} appointments per day.`,
      }
    }

    // Check for double booking
    const existingAppointment = appointments.find(
      (apt) =>
        apt.doctorId === doctorId &&
        apt.appointmentDate === date &&
        apt.appointmentTime === time &&
        apt.status !== 'Cancelled' &&
        apt.status !== 'No_Show'
    )

    if (existingAppointment) {
      return {
        available: false,
        reason: 'This time slot is already booked.',
      }
    }

    return { available: true }
  }

  /**
   * Get daily appointment count for a doctor
   * 
   * Rule 2: This checks ONLY the Appointments Table (not invoices/revenue)
   * Counts all appointments regardless of payment status
   * Used to enforce the 10-patient daily limit
   */
  const getDoctorDailyCount = (doctorId: string, date: string): number => {
    return appointments.filter(
      (apt) =>
        apt.doctorId === doctorId &&
        apt.appointmentDate === date &&
        apt.status !== 'Cancelled' &&
        apt.status !== 'No_Show'
    ).length
  }

  const markNoShow = (appointmentId: string) => {
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId
          ? { ...apt, status: 'No_Show', noShowAt: new Date().toISOString() }
          : apt
      )
    )
  }

  const getUpcomingAppointments = (minutes: number): Appointment[] => {
    const now = new Date()
    const targetTime = new Date(now.getTime() + minutes * 60000)

    return appointments.filter((apt) => {
      if (apt.status !== 'Scheduled') return false

      const appointmentDateTime = new Date(`${apt.appointmentDate}T${apt.appointmentTime}`)
      const timeDiff = appointmentDateTime.getTime() - now.getTime()

      return timeDiff > 0 && timeDiff <= minutes * 60000
    })
  }

  return (
    <AppointmentsContext.Provider
      value={{
        appointments,
        createAppointment,
        updateAppointmentStatus,
        getAppointmentsByDoctor,
        getAppointmentsByDate,
        checkDoctorAvailability,
        getDoctorDailyCount,
        markNoShow,
        getUpcomingAppointments,
      }}
    >
      {children}
    </AppointmentsContext.Provider>
  )
}

export function useAppointments() {
  const context = useContext(AppointmentsContext)
  if (context === undefined) {
    throw new Error('useAppointments must be used within an AppointmentsProvider')
  }
  return context
}

