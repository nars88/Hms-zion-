'use client'

import { Clock, AlertCircle } from 'lucide-react'

export interface PharmacyOrder {
  id: string
  patientName: string
  patientId: string
  visitId: string
  status: 'READY_FOR_PHARMACY'
  diagnosis: string
  prescription: Array<{
    medication: string
    dosage: string
    frequency: string
    duration: string
    notes?: string
  }>
  diagnosticResults?: {
    lab?: Array<{ testName: string; value: string; status: string }>
    ecg?: { heartRate: number; rhythm: string; status: string }
    imaging?: Array<{ studyType: string; findings: string; status: string }>
  }
  allergies?: string[]
  createdAt: string
  waitTime: string
}

// Mock data - Sample Lab + Radiology results for testing pharmacy layout (all English)
export const mockOrders: PharmacyOrder[] = [
  {
    id: '1',
    patientName: 'John Doe',
    patientId: 'P001',
    visitId: 'V001',
    status: 'READY_FOR_PHARMACY',
    diagnosis: 'Upper Respiratory Tract Infection',
    prescription: [
      {
        medication: 'Amoxicillin',
        dosage: '500mg',
        frequency: 'Three times daily',
        duration: '7 days',
        notes: 'Take with food',
      },
      {
        medication: 'Paracetamol',
        dosage: '500mg',
        frequency: 'As needed',
        duration: '5 days',
      },
    ],
    diagnosticResults: {
      lab: [
        { testName: 'CBC', value: 'Normal', status: 'Normal' },
        { testName: 'WBC', value: '8.2 x10^9/L', status: 'Normal' },
        { testName: 'Glucose', value: '98 mg/dL', status: 'Normal' },
        { testName: 'CRP', value: 'Elevated', status: 'Abnormal' },
      ],
      imaging: [
        { studyType: 'Chest X-Ray', findings: 'Clear. No focal consolidation. No pleural effusion.', status: 'Normal' },
      ],
    },
    allergies: ['Penicillin'],
    createdAt: '2024-01-15 10:30',
    waitTime: '5 min',
  },
  {
    id: '2',
    patientName: 'Jane Smith',
    patientId: 'P002',
    visitId: 'V002',
    status: 'READY_FOR_PHARMACY',
    diagnosis: 'Hypertension',
    prescription: [
      {
        medication: 'Lisinopril',
        dosage: '10mg',
        frequency: 'Once daily',
        duration: '30 days',
      },
      {
        medication: 'Aspirin',
        dosage: '81mg',
        frequency: 'Once daily',
        duration: '30 days',
      },
    ],
    diagnosticResults: {
      lab: [
        { testName: 'CBC', value: 'Normal', status: 'Normal' },
        { testName: 'Glucose', value: '110 mg/dL', status: 'Abnormal' },
        { testName: 'Blood Pressure', value: '150/95 mmHg', status: 'Abnormal' },
        { testName: 'Creatinine', value: '0.9 mg/dL', status: 'Normal' },
      ],
      ecg: { heartRate: 72, rhythm: 'Normal Sinus', status: 'Normal' },
      imaging: [
        { studyType: 'Chest X-Ray', findings: 'Clear. No abnormalities found. Heart size normal.', status: 'Normal' },
      ],
    },
    allergies: [],
    createdAt: '2024-01-15 10:15',
    waitTime: '20 min',
  },
  {
    id: '3',
    patientName: 'Robert Johnson',
    patientId: 'P003',
    visitId: 'V003',
    status: 'READY_FOR_PHARMACY',
    diagnosis: 'Type 2 Diabetes',
    prescription: [
      {
        medication: 'Metformin',
        dosage: '500mg',
        frequency: 'Twice daily',
        duration: '30 days',
      },
    ],
    diagnosticResults: {
      lab: [
        { testName: 'CBC', value: 'Normal', status: 'Normal' },
        { testName: 'Glucose (Fasting)', value: '145 mg/dL', status: 'Abnormal' },
        { testName: 'HbA1c', value: '7.2%', status: 'Abnormal' },
        { testName: 'Creatinine', value: '1.0 mg/dL', status: 'Normal' },
        { testName: 'Lipid Panel', value: 'LDL 140 mg/dL', status: 'Abnormal' },
      ],
      imaging: [
        { studyType: 'Chest X-Ray', findings: 'No acute cardiopulmonary abnormality. No infiltrates.', status: 'Normal' },
      ],
    },
    allergies: ['Sulfa drugs'],
    createdAt: '2024-01-15 09:45',
    waitTime: '50 min',
  },
]

interface LiveOrderFeedProps {
  orders: PharmacyOrder[]
  onSelectOrder: (order: PharmacyOrder) => void
  selectedOrderId?: string
}

export default function LiveOrderFeed({ orders, onSelectOrder, selectedOrderId }: LiveOrderFeedProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-800/50">
        <h2 className="text-lg font-semibold text-primary mb-1">Live Order Feed</h2>
        <p className="text-xs text-secondary">{orders.length} orders pending</p>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-3">
          {orders.map((order) => {
            const hasAllergies = order.allergies && order.allergies.length > 0
            return (
              <button
                key={order.id}
                onClick={() => onSelectOrder(order)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  selectedOrderId === order.id
                    ? 'bg-cyan-500/10 border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                    : 'glass border-slate-800/50 hover:border-slate-700/50 hover:bg-slate-800/20'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-primary">{order.patientName}</h3>
                    <p className="text-xs text-secondary mt-0.5">{order.patientId}</p>
                  </div>
                  {hasAllergies && (
                    <div className="px-2 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-xs flex items-center gap-1">
                      <AlertCircle size={10} />
                      Allergies
                    </div>
                  )}
                </div>

                <p className="text-xs text-secondary mb-2 line-clamp-1">{order.diagnosis}</p>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/30">
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <Clock size={12} />
                    <span>{order.waitTime}</span>
                  </div>
                  <span className="text-xs text-cyan-400 font-medium">
                    {order.prescription.length} medication{order.prescription.length > 1 ? 's' : ''}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

