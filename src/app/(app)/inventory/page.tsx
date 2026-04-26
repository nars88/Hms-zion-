'use client'

import { useState } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import ZionMedLogo from '@/components/ZionMedLogo'
import StockEntry from '@/components/inventory/StockEntry'
import InventoryList from '@/components/inventory/InventoryList'
import InventoryAlerts from '@/components/inventory/InventoryAlerts'
import InventoryReports from '@/components/inventory/InventoryReports'

export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState<'list' | 'entry' | 'alerts' | 'reports'>('list')

  return (
    <ProtectedRoute allowedRoles={['PHARMACIST', 'ADMIN']} redirectTo="/">
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="glass border-b border-slate-800/50 px-8 flex-shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'list'
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Inventory List
              </button>
              <button
                onClick={() => setActiveTab('entry')}
                className={`px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'entry'
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Stock Entry
              </button>
              <button
                onClick={() => setActiveTab('alerts')}
                className={`px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'alerts'
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Alerts
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === 'reports'
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-secondary hover:text-primary'
                }`}
              >
                Reports
              </button>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto">
              {activeTab === 'list' && <InventoryList />}
              {activeTab === 'entry' && <StockEntry />}
              {activeTab === 'alerts' && <InventoryAlerts />}
              {activeTab === 'reports' && <InventoryReports />}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}

