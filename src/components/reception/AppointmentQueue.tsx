'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, User, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { useAppointments } from '@/contexts/AppointmentsContext'
import { useWaitingList } from '@/contexts/WaitingListContext'

export default function AppointmentQueue() {
  const { appointments, updateAppointmentStatus, markNoShow } = useAppointments()
  const { updatePatientStatus } = useWaitingList()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  // Get appointments for selected date
  const dayAppointments = appointments.filter(
    (apt) => apt.appointmentDate === selectedDate && apt.status !== 'Cancelled'
  )

  const handleStartAppointment = (appointmentId: string) => {
    updateAppointmentStatus(appointmentId, 'In_Progress')
    // Add patient to waiting list if not already there
    const appointment = appointments.find((apt) => apt.id === appointmentId)
    if (appointment) {
      updatePatientStatus(appointment.patientId, 'In_Consultation')
    }
  }

  const handleCompleteAppointment = (appointmentId: string) => {
    updateAppointmentStatus(appointmentId, 'Completed')
    const appointment = appointments.find((apt) => apt.id === appointmentId)
    if (appointment) {
      updatePatientStatus(appointment.patientId, 'Pending Payment')
    }
  }

  const handleNoShow = (appointmentId: string) => {
    markNoShow(appointmentId)
    // This frees up the slot for another patient
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'In_Progress':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'Completed':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'No_Show':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      default:
        return 'bg-slate-800/50 text-slate-400 border-slate-700/50'
    }
  }

  return (
    <div className="glass rounded-xl border border-slate-800/50">
      <div className="p-6 border-b border-slate-800/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-primary">Appointment Queue</h2>
            <p className="text-xs text-secondary mt-1">Manage scheduled appointments</p>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 bg-slate-900/30 border border-slate-800/50 rounded-lg text-primary text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50"
          />
        </div>
      </div>

      <div className="p-6">
        {dayAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto mb-4 text-slate-600" />
            <p className="text-sm text-secondary">No appointments scheduled for this date</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayAppointments
              .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime))
              .map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-4 bg-slate-900/30 border border-slate-800/50 rounded-lg hover:border-slate-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Clock size={16} className="text-cyan-400" />
                        <span className="text-sm font-semibold text-primary">{appointment.appointmentTime}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(
                            appointment.status
                          )}`}
                        >
                          {appointment.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <User size={14} className="text-secondary" />
                        <span className="text-sm text-primary font-medium">{appointment.patientName}</span>
                      </div>
                      <p className="text-xs text-secondary">Doctor: {appointment.doctorName}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {appointment.status === 'Scheduled' && (
                        <>
                          <button
                            onClick={() => handleStartAppointment(appointment.id)}
                            className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/15 transition-all text-xs font-medium flex items-center gap-1"
                          >
                            <CheckCircle size={14} />
                            Start
                          </button>
                          <button
                            onClick={() => handleNoShow(appointment.id)}
                            className="px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/15 transition-all text-xs font-medium flex items-center gap-1"
                          >
                            <XCircle size={14} />
                            No Show
                          </button>
                        </>
                      )}
                      {appointment.status === 'In_Progress' && (
                        <button
                          onClick={() => handleCompleteAppointment(appointment.id)}
                          className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/15 transition-all text-xs font-medium flex items-center gap-1"
                        >
                          <CheckCircle size={14} />
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  )
}

