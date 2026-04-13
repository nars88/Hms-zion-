'use client'

import { useState, useEffect } from 'react'
import { Bell, Clock, X, CheckCircle } from 'lucide-react'
import { useAppointments } from '@/contexts/AppointmentsContext'

export default function AppointmentNotifications() {
  const { getUpcomingAppointments, updateAppointmentStatus } = useAppointments()
  const [notifications, setNotifications] = useState<Array<{ id: string; message: string; type: 'reminder' | 'available' }>>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Check for upcoming appointments (15 minutes before)
    const checkReminders = () => {
      const upcoming = getUpcomingAppointments(15) // 15 minutes before
      const newReminders = upcoming
        .filter((apt) => !apt.reminderSent)
        .map((apt) => ({
          id: apt.id,
          message: `Reminder: ${apt.patientName} has an appointment with ${apt.doctorName} at ${apt.appointmentTime}`,
          type: 'reminder' as const,
        }))

      if (newReminders.length > 0) {
        setNotifications((prev) => [...prev, ...newReminders])
        // Mark as reminder sent (in production, update in database)
        newReminders.forEach((reminder) => {
          const appointment = upcoming.find((apt) => apt.id === reminder.id)
          if (appointment) {
            // Update reminder status
            console.log('Reminder sent for appointment:', appointment.id)
          }
        })
      }
    }

    // Check every minute
    const interval = setInterval(checkReminders, 60000)
    checkReminders() // Initial check

    return () => clearInterval(interval)
  }, [getUpcomingAppointments])

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notif) => notif.id !== id))
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
      >
        <Bell size={20} className="text-cyan-400" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-80 glass rounded-xl border border-slate-800/50 shadow-xl z-50">
          <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary">Notifications</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-secondary hover:text-primary transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell size={32} className="mx-auto mb-3 text-slate-600" />
                <p className="text-sm text-secondary">No notifications</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="p-3 bg-slate-900/30 border border-slate-800/50 rounded-lg hover:border-cyan-500/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1">
                        <Clock size={16} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-primary leading-relaxed">{notif.message}</p>
                      </div>
                      <button
                        onClick={() => removeNotification(notif.id)}
                        className="text-secondary hover:text-primary transition-colors flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-3 border-t border-slate-800/50">
              <button
                onClick={() => setNotifications([])}
                className="w-full px-3 py-2 bg-slate-800/50 text-secondary border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-all text-xs font-medium"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

