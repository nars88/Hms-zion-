'use client'

import { useState } from 'react'
import StatsCards from '@/components/reception/StatsCards'
import QuickActions from '@/components/reception/QuickActions'
import PatientSearch from '@/components/reception/PatientSearch'
import PatientRegistrationModal from '@/components/reception/PatientRegistrationModal'
import ERRegistrationModal from '@/components/reception/ERRegistrationModal'
import CheckInModal from '@/components/reception/CheckInModal'
import PatientQueue from '@/components/reception/PatientQueue'

export default function AdminReceptionPage() {
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)
  const [showERRegistrationModal, setShowERRegistrationModal] = useState(false)
  const [showCheckInModal, setShowCheckInModal] = useState(false)
  const [showWaitingListModal, setShowWaitingListModal] = useState(false)

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-hidden p-6 pb-8">
        <div className="max-w-7xl mx-auto h-full flex flex-col gap-3">
          <div className="flex-shrink-0">
            <PatientSearch />
          </div>
          <div className="flex-shrink-0">
            <QuickActions
              onNewPatient={() => setShowRegistrationModal(true)}
              onERQuick={() => setShowERRegistrationModal(true)}
            />
          </div>
          <div className="flex-shrink-0">
            <StatsCards onWaitingPatientsClick={() => setShowWaitingListModal(true)} />
          </div>
        </div>
      </main>
      {showRegistrationModal && (
        <PatientRegistrationModal
          onClose={() => setShowRegistrationModal(false)}
        />
      )}
      {showERRegistrationModal && (
        <ERRegistrationModal
          onClose={() => setShowERRegistrationModal(false)}
        />
      )}
      {showCheckInModal && (
        <CheckInModal onClose={() => setShowCheckInModal(false)} />
      )}
      {showWaitingListModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowWaitingListModal(false)}
        >
          <div
            className="glass rounded-xl border border-slate-800/50 w-full max-w-6xl max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-primary">Waiting Patients Queue</h2>
                <p className="text-xs text-secondary mt-1">All patients currently waiting for consultation</p>
              </div>
              <button
                onClick={() => setShowWaitingListModal(false)}
                className="text-secondary hover:text-primary text-2xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800/50 transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <PatientQueue />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
