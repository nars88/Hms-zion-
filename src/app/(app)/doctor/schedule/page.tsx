'use client'

import { useState, useMemo } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import DoctorSidebar from '@/components/doctor/DoctorSidebar'
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  User,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

type ViewMode = 'day' | 'week'
type VisitType = 'Consultation' | 'Follow-up' | 'Surgery'

interface Appointment {
  id: string
  patientName: string
  visitType: VisitType
  start: string // "HH:mm"
  durationMinutes: number
  dateKey: string // "YYYY-MM-DD"
}

/** Subtle bg + left border for type; blocks are width-constrained by content */
const VISIT_TYPE_STYLE: Record<VisitType, string> = {
  Consultation: 'bg-slate-800/80 border-l-4 border-l-cyan-500 text-slate-200',
  'Follow-up': 'bg-slate-800/80 border-l-4 border-l-emerald-500 text-slate-200',
  Surgery: 'bg-slate-800/80 border-l-4 border-l-amber-500 text-slate-200',
}

/** Mock appointments for today and tomorrow */
function getMockAppointments(): Appointment[] {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  return [
    { id: '1', patientName: 'Ahmed Hassan', visitType: 'Consultation', start: '09:00', durationMinutes: 30, dateKey: fmt(today) },
    { id: '2', patientName: 'Sara Mohammed', visitType: 'Follow-up', start: '10:00', durationMinutes: 15, dateKey: fmt(today) },
    { id: '3', patientName: 'Omar Khalid', visitType: 'Consultation', start: '11:30', durationMinutes: 45, dateKey: fmt(today) },
    { id: '4', patientName: 'Layla Ibrahim', visitType: 'Surgery', start: '14:00', durationMinutes: 60, dateKey: fmt(today) },
    { id: '5', patientName: 'Fatima Ali', visitType: 'Follow-up', start: '15:30', durationMinutes: 30, dateKey: fmt(today) },
    { id: '6', patientName: 'Youssef Mahmoud', visitType: 'Consultation', start: '09:30', durationMinutes: 30, dateKey: fmt(tomorrow) },
    { id: '7', patientName: 'Nora Ahmed', visitType: 'Surgery', start: '11:00', durationMinutes: 90, dateKey: fmt(tomorrow) },
    { id: '8', patientName: 'Khalid Omar', visitType: 'Follow-up', start: '14:30', durationMinutes: 15, dateKey: fmt(tomorrow) },
  ]
}

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00',
]

const SLOT_HEIGHT_PX = 48
const MINUTES_PER_SLOT = 30

function parseTime(s: string): number {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}

function formatTime(s: string): string {
  const [h, m] = s.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`
}

export default function DoctorSchedulePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('day')
  const [baseDate, setBaseDate] = useState(() => new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [formPatientName, setFormPatientName] = useState('')
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [formTime, setFormTime] = useState('09:00')
  const appointments = useMemo(() => getMockAppointments(), [])

  const { daysToShow, dayLabels } = useMemo(() => {
    if (viewMode === 'day') {
      const d = new Date(baseDate)
      return {
        daysToShow: [d],
        dayLabels: [d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })],
      }
    }
    const start = new Date(baseDate)
    const dow = start.getDay()
    const sun = new Date(start)
    sun.setDate(start.getDate() - (dow === 0 ? 0 : dow))
    const days: Date[] = []
    const labels: string[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(sun)
      day.setDate(sun.getDate() + i)
      days.push(day)
      labels.push(day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
    }
    return { daysToShow: days, dayLabels: labels }
  }, [viewMode, baseDate])

  const dateKeys = useMemo(() => daysToShow.map(d => d.toISOString().slice(0, 10)), [daysToShow])
  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const showCurrentTime = dateKeys.includes(todayKey)
  const currentSlotIndex = useMemo(() => {
    const now = new Date()
    const mins = now.getHours() * 60 + now.getMinutes()
    const startMins = 9 * 60
    if (mins < startMins || mins >= 17 * 60) return -1
    return Math.floor((mins - startMins) / MINUTES_PER_SLOT)
  }, [])
  const currentSlotString = currentSlotIndex >= 0 && currentSlotIndex < TIME_SLOTS.length ? TIME_SLOTS[currentSlotIndex] : null

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    dateKeys.forEach(k => { map[k] = [] })
    appointments.forEach(apt => {
      if (dateKeys.includes(apt.dateKey)) (map[apt.dateKey] = map[apt.dateKey] || []).push(apt)
    })
    return map
  }, [appointments, dateKeys])

  return (
    <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']} redirectTo="/">
      <div className="flex h-screen bg-primary text-primary overflow-hidden">
        <DoctorSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Compact top bar */}
          <div className="flex-shrink-0 px-4 py-2.5 border-b border-slate-800/50 bg-slate-900/30 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-cyan-500/20 flex items-center justify-center shrink-0">
                <CalendarIcon size={16} className="text-cyan-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-slate-100 leading-tight">Schedule</h1>
                <p className="text-[10px] text-slate-500 leading-tight">Manage your appointments</p>
              </div>
              <div className="flex items-center rounded-md border border-slate-700 bg-slate-800/50 overflow-hidden shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(baseDate)
                    if (viewMode === 'day') d.setDate(d.getDate() - 1)
                    else d.setDate(d.getDate() - 7)
                    setBaseDate(d)
                  }}
                  className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
                  aria-label="Previous"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2.5 py-1 text-xs text-slate-300 whitespace-nowrap min-w-[100px] text-center">
                  {viewMode === 'day'
                    ? baseDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : (() => {
                        const start = new Date(baseDate)
                        const dow = start.getDay()
                        const sun = new Date(start)
                        sun.setDate(start.getDate() - (dow === 0 ? 0 : dow))
                        const sat = new Date(sun)
                        sat.setDate(sun.getDate() + 6)
                        return `${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sat.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                      })()}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(baseDate)
                    if (viewMode === 'day') d.setDate(d.getDate() + 1)
                    else d.setDate(d.getDate() + 7)
                    setBaseDate(d)
                  }}
                  className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
                  aria-label="Next"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="flex rounded-md overflow-hidden border border-slate-700 bg-slate-800/50 p-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('day')}
                  className={`px-2.5 py-1.5 text-xs font-medium transition-all ${viewMode === 'day' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Day
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('week')}
                  className={`px-2.5 py-1.5 text-xs font-medium transition-all ${viewMode === 'week' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  Week
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-all border border-cyan-500/50 shrink-0"
            >
              <Plus size={16} />
              Add New Appointment
            </button>
          </div>

          {/* Calendar */}
          <div className="flex-1 overflow-auto p-6 relative">
            <div className="rounded-xl border border-slate-700/80 bg-slate-900/40 overflow-hidden shadow-xl relative">
              <div
                className="grid bg-transparent"
                style={{
                  gridTemplateColumns: `104px repeat(${daysToShow.length}, minmax(0, 1fr))`,
                  gridTemplateRows: `40px repeat(${TIME_SLOTS.length}, ${SLOT_HEIGHT_PX}px)`,
                  gap: 0,
                }}
              >
                {/* Row 0: corner + day headers */}
                <div className="bg-slate-800/80 flex items-center justify-center border-b border-slate-700/50" />
                {dayLabels.map((label) => (
                  <div
                    key={label}
                    className="bg-slate-800/80 flex items-center justify-center border-b border-slate-700/50 text-xs font-semibold text-slate-300"
                  >
                    {label}
                  </div>
                ))}
                {/* Each row: time cell + one cell per day (flat list for grid); dotted row borders */}
                {TIME_SLOTS.flatMap((slot, slotIdx) => [
                  <div
                    key={`time-${slot}`}
                    className="bg-slate-800/60 flex items-center justify-center text-sm font-bold text-white border-b border-dotted border-slate-600/50 min-h-[48px]"
                  >
                    {formatTime(slot)}
                  </div>,
                  ...dateKeys.map((dateKey, colIdx) => {
                    const isFirstSlotOfApt = (apt: Appointment) => apt.start === slot
                    const cellAppointments = (appointmentsByDate[dateKey] || []).filter(isFirstSlotOfApt)
                    const isNowCell = showCurrentTime && currentSlotString === slot && dateKey === todayKey
                    return (
                      <div
                        key={`${dateKey}-${slot}`}
                        className="bg-slate-800/40 relative min-h-[48px] border-b border-dotted border-slate-600/40"
                      >
                        {isNowCell && (
                          <div className="absolute left-0 right-0 top-0 h-0.5 bg-red-500 z-20 ring-1 ring-red-400/50" aria-hidden title="Current time" />
                        )}
                        {cellAppointments.map((apt) => {
                          const slotsSpan = Math.max(1, Math.ceil(apt.durationMinutes / MINUTES_PER_SLOT))
                          return (
                            <div
                              key={apt.id}
                              className={`absolute left-2 rounded-lg border border-slate-600/50 p-2.5 overflow-hidden shadow-sm ${VISIT_TYPE_STYLE[apt.visitType]}`}
                              style={{
                                top: 4,
                                width: 'calc(100% - 12px)',
                                maxWidth: 280,
                                height: slotsSpan * SLOT_HEIGHT_PX - 8,
                                zIndex: 10,
                              }}
                            >
                              <div className="flex items-center gap-2 text-sm font-bold text-white truncate leading-tight">
                                <User size={14} className="flex-shrink-0 text-white/90" />
                                <span className="truncate">{apt.patientName}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-white/90">
                                <Stethoscope size={12} />
                                {apt.visitType}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-white">
                                <Clock size={12} />
                                {formatTime(apt.start)} · {apt.durationMinutes} min
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  }),
                ])}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Appointment modal — Zion dark */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="w-full max-w-md rounded-xl border border-slate-700 bg-[#0F172A] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-700">
              <h2 id="modal-title" className="text-lg font-bold text-slate-100">Add New Appointment</h2>
              <p className="text-xs text-slate-500 mt-0.5">Patient name, date, and time</p>
            </div>
            <form
              className="p-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                // TODO: persist appointment
                setModalOpen(false)
                setFormPatientName('')
                setFormDate(new Date().toISOString().slice(0, 10))
                setFormTime('09:00')
              }}
            >
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Patient Name</label>
                <input
                  type="text"
                  value={formPatientName}
                  onChange={(e) => setFormPatientName(e.target.value)}
                  placeholder="Enter patient name"
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Time</label>
                <input
                  type="time"
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 px-3 py-2.5 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ProtectedRoute>
  )
}
