'use client'

import { TestTube } from 'lucide-react'

export default function AdminLabResultsPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-800/50 bg-slate-900/30 flex-shrink-0">
        <h1 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <TestTube size={20} className="text-cyan-400" />
          Lab Results
        </h1>
      </div>
      <main className="flex-1 overflow-auto p-6">
        <p className="text-slate-400">Results view. Complete results workflow can be added here.</p>
      </main>
    </div>
  )
}
