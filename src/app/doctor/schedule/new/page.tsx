'use client'

import Link from 'next/link'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import DoctorSidebar from '@/components/doctor/DoctorSidebar'
import { ArrowLeft, CalendarPlus } from 'lucide-react'

export default function NewAppointmentPage() {
  return (
    <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']} redirectTo="/">
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <DoctorSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-6 py-4 border-b border-slate-800/50 bg-slate-900/30 flex items-center gap-4">
            <Link
              href="/doctor/schedule"
              className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-cyan-400 rounded-lg transition-colors"
            >
              <ArrowLeft size={18} />
              Back to Schedule
            </Link>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center max-w-md rounded-xl border border-slate-700 bg-slate-800/50 p-8">
              <div className="h-14 w-14 rounded-xl bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                <CalendarPlus size={28} className="text-cyan-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-100 mb-2">Add New Appointment</h2>
              <p className="text-sm text-slate-400 mb-6">
                Form to create a new appointment will be available here. Use the Schedule view to manage your calendar.
              </p>
              <Link
                href="/doctor/schedule"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Back to Schedule
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
