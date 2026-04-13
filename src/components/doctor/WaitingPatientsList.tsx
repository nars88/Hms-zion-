'use client'

import { useState, useEffect } from 'react'
import { useWaitingList } from '@/contexts/WaitingListContext'
import { isERVisitId } from '@/lib/visitIdGenerator'
import { useLanguage } from '@/contexts/LanguageContext'

interface WaitingPatientsListProps {
  onSelectPatient: (patient: any) => void
  selectedPatientId?: string
}

// Mock data - will be replaced with Prisma queries
const mockPatients = [
  {
    id: '1',
    name: 'John Doe',
    age: 45,
    gender: 'Male',
    priority: 'High',
    chiefComplaint: 'Chest pain and shortness of breath',
    checkInTime: '09:15 AM',
    waitTime: '15 min',
    triage: {
      symptoms: 'Chest pain, shortness of breath, sweating',
      priority: 1,
      vitalSigns: {
        bp: '140/90',
        temperature: '98.6°F',
        pulse: '88 bpm',
      },
    },
  },
  {
    id: '2',
    name: 'Jane Smith',
    age: 32,
    gender: 'Female',
    priority: 'Medium',
    chiefComplaint: 'Fever and persistent cough',
    checkInTime: '09:30 AM',
    waitTime: '30 min',
    triage: {
      symptoms: 'Fever (101°F), dry cough, fatigue',
      priority: 2,
      vitalSigns: {
        bp: '120/80',
        temperature: '101.2°F',
        pulse: '95 bpm',
      },
    },
  },
  {
    id: '3',
    name: 'Robert Johnson',
    age: 58,
    gender: 'Male',
    priority: 'Low',
    chiefComplaint: 'Routine checkup',
    checkInTime: '09:45 AM',
    waitTime: '45 min',
    triage: {
      symptoms: 'No acute symptoms, routine visit',
      priority: 3,
      vitalSigns: {
        bp: '130/85',
        temperature: '98.4°F',
        pulse: '72 bpm',
      },
    },
  },
  {
    id: '4',
    name: 'Sarah Williams',
    age: 28,
    gender: 'Female',
    priority: 'High',
    chiefComplaint: 'Severe headache and nausea',
    checkInTime: '10:00 AM',
    waitTime: '10 min',
    triage: {
      symptoms: 'Severe headache, nausea, photophobia',
      priority: 1,
      vitalSigns: {
        bp: '110/70',
        temperature: '98.8°F',
        pulse: '82 bpm',
      },
    },
  },
]

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'High':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    case 'Medium':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    case 'Low':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
    default:
      return 'bg-slate-800/50 text-slate-400 border-slate-700/50'
  }
}

export default function WaitingPatientsList({ onSelectPatient, selectedPatientId }: WaitingPatientsListProps) {
  const { waitingPatients } = useWaitingList()
  const [patients, setPatients] = useState(mockPatients)
  const { t, formatNumber } = useLanguage()

  // Merge waiting list patients with mock data
  useEffect(() => {
    const waitingListPatients = waitingPatients
      .filter((p) => p.status === 'Waiting')
      .map((p) => ({
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        name: `${p.firstName} ${p.lastName}`,
        age: p.age,
        gender: p.gender,
        visitId: p.visitId, // Include visitId for ER detection
        priority: 'Medium',
        chiefComplaint: p.chiefComplaint || 'New patient registration',
        checkInTime: new Date(p.registeredAt).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        waitTime: `${Math.floor((Date.now() - new Date(p.registeredAt).getTime()) / 60000)} min`,
        triage: {
          symptoms: 'Registered by reception',
          priority: 3,
          vitalSigns: {
            bp: 'N/A',
            temperature: 'N/A',
            pulse: 'N/A',
          },
        },
      }))
    
    // Combine with existing mock patients
    setPatients([...waitingListPatients, ...mockPatients])
  }, [waitingPatients])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/50 flex-shrink-0">
        <h2 className="text-base font-semibold text-primary mb-0.5">{t('patient.waiting')}</h2>
        <p className="text-xs text-secondary">{formatNumber(patients.length)} {t('common.inQueue')}</p>
      </div>

      {/* Patient List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-3 space-y-2">
          {patients.map((patient) => {
            // Check if this is an Emergency patient
            const pid = patient as { visitId?: string; chiefComplaint?: string }
            const isEmergency = pid.visitId
              ? isERVisitId(pid.visitId)
              : pid.chiefComplaint === 'Emergency'
            
            return (
            <button
              key={patient.id}
              onClick={() => onSelectPatient(patient)}
              className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                isEmergency
                  ? 'bg-red-500/10 border-red-500/40 shadow-lg shadow-red-500/20'
                  : selectedPatientId === patient.id
                  ? 'bg-cyan-500/10 border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                  : 'glass border-slate-800/50 hover:border-slate-700/50 hover:bg-slate-800/20'
              }`}
              style={isEmergency ? {
                boxShadow: '0 0 15px rgba(239, 68, 68, 0.4), 0 0 30px rgba(239, 68, 68, 0.15), inset 0 0 10px rgba(239, 68, 68, 0.1)'
              } : {}}
            >
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold truncate ${
                    isEmergency ? 'text-red-400 font-bold' : 'text-primary'
                  }`}>
                    {patient.name}
                  </h3>
                  <p className={`text-xs mt-0.5 ${
                    isEmergency ? 'text-red-300' : 'text-secondary'
                  }`}>
                    {formatNumber(patient.age)} {t('common.years')}, {patient.gender}
                  </p>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-medium border flex-shrink-0 ml-2 ${
                    isEmergency 
                      ? 'bg-red-500/20 text-red-400 border-red-500/40 font-bold'
                      : getPriorityColor(patient.priority)
                  }`}
                >
                  {isEmergency ? t('patient.emergency') : patient.priority}
                </span>
              </div>

              <p className={`text-[11px] mb-1.5 line-clamp-2 leading-tight ${
                isEmergency ? 'text-red-300 font-medium' : 'text-secondary'
              }`}>
                {patient.chiefComplaint}
              </p>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/30">
                <div className={`flex items-center gap-2 text-[10px] ${
                  isEmergency ? 'text-red-300' : 'text-secondary'
                }`}>
                  <span>⏰ {patient.waitTime}</span>
                  <span>🕐 {patient.checkInTime}</span>
                </div>
                {selectedPatientId === patient.id && (
                  <span className="text-[10px] text-cyan-400 font-medium">{t('common.selected')}</span>
                )}
              </div>
            </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

