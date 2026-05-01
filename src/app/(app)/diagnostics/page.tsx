'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import MedicalImaging from '@/components/diagnostics/MedicalImaging'
import Cardiology from '@/components/diagnostics/Cardiology'
import ClinicalLab from '@/components/diagnostics/ClinicalLab'
import { Scan, Activity, Microscope } from 'lucide-react'
type TabType = 'imaging' | 'cardiology' | 'lab'

const tabs = [
  { id: 'imaging' as TabType, label: 'Medical Imaging', icon: Scan },
  { id: 'cardiology' as TabType, label: 'Cardiology', icon: Activity },
  { id: 'lab' as TabType, label: 'Clinical Lab', icon: Microscope },
]

export default function DiagnosticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('imaging')

  return (
    <ProtectedRoute allowedRoles={['DOCTOR', 'LAB_TECH', 'ADMIN']} redirectTo="/">
      <div className="flex h-screen bg-primary text-primary overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
        {/* Tabs */}
        <div className="border-b border-slate-800/50 px-8">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all ${
                    isActive
                      ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                      : 'border-transparent text-secondary hover:text-primary hover:bg-slate-800/20'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'imaging' && <MedicalImaging />}
          {activeTab === 'cardiology' && <Cardiology />}
          {activeTab === 'lab' && <ClinicalLab />}
        </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

