'use client'

import { useState } from 'react'
import { X, AlertTriangle, Download, ZoomIn, FileImage, Printer } from 'lucide-react'
import { printRadiologyReport } from '@/lib/printUtils'
import { printMedicalReport } from '@/lib/medicalReportPrint'

interface ImagingStudy {
  id: string
  patientName: string
  patientId: string
  studyType: 'CT' | 'MRI' | 'X-Ray'
  bodyPart: string
  date: string
  status: 'Pending' | 'Completed' | 'Urgent'
  dicomFile?: string
  aiAnalysis?: {
    findings: string
    risk: 'Low' | 'Medium' | 'High'
    confidence: number
  }
  version?: number
  editedBy?: string
  editHistory?: Array<{ version: number; editedBy: string; editedAt: string; previousValue: string }>
}

/** UI-only demo: two patients per diagnostics imaging tab (no DB). */
const mockStudies: ImagingStudy[] = [
  {
    id: 'dx-img-mock-1',
    patientName: 'مريض تجريبي أ — Demo Alpha',
    patientId: 'DX-MOCK-IMG-01',
    studyType: 'CT',
    bodyPart: 'Chest',
    date: '2026-04-24 09:00',
    status: 'Pending',
    version: 1,
  },
  {
    id: 'dx-img-mock-2',
    patientName: 'مريض تجريبي ب — Demo Beta',
    patientId: 'DX-MOCK-IMG-02',
    studyType: 'MRI',
    bodyPart: 'Brain',
    date: '2026-04-24 10:15',
    status: 'Completed',
    aiAnalysis: {
      findings: 'No focal lesion; ventricular system within normal limits (demo).',
      risk: 'Low',
      confidence: 91,
    },
    version: 1,
  },
]

export default function MedicalImaging() {
  const [selectedStudy, setSelectedStudy] = useState<ImagingStudy | null>(null)
  const [filter, setFilter] = useState<'All' | 'CT' | 'MRI' | 'X-Ray'>('All')

  const filteredStudies = filter === 'All' 
    ? mockStudies 
    : mockStudies.filter(s => s.studyType === filter)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Urgent':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
      case 'Completed':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'Pending':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      default:
        return 'bg-slate-800/50 text-slate-400 border-slate-700/50'
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'High':
        return 'text-rose-400'
      case 'Medium':
        return 'text-amber-400'
      case 'Low':
        return 'text-emerald-400'
      default:
        return 'text-slate-400'
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-primary">Medical Imaging Studies</h2>
          <p className="text-xs text-secondary mt-1">DICOM-compatible imaging viewer and analysis</p>
        </div>
        <div className="flex items-center gap-2">
          {(['All', 'CT', 'MRI', 'X-Ray'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-slate-800/50 text-secondary border border-slate-700/50 hover:bg-slate-700/50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Studies List */}
        <div className="lg:col-span-1 space-y-3">
          {filteredStudies.map((study) => (
            <div
              key={study.id}
              onClick={() => setSelectedStudy(study)}
              className={`glass rounded-xl border p-4 cursor-pointer transition-all ${
                selectedStudy?.id === study.id
                  ? 'border-cyan-500/40 bg-cyan-500/5'
                  : 'border-slate-800/50 hover:border-slate-700/50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-primary">{study.patientName}</h3>
                  <p className="text-xs text-secondary mt-0.5">{study.patientId}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(study.status)}`}>
                  {study.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-secondary mb-2">
                <span>{study.studyType}</span>
                <span>•</span>
                <span>{study.bodyPart}</span>
              </div>
              {study.aiAnalysis && (
                <div className="mt-2 pt-2 border-t border-slate-800/30">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={12} className={getRiskColor(study.aiAnalysis.risk)} />
                    <span className={`text-xs font-medium ${getRiskColor(study.aiAnalysis.risk)}`}>
                      {study.aiAnalysis.risk} Risk
                    </span>
                  </div>
                </div>
              )}
              {study.version && study.version > 1 && (
                <div className="mt-2 text-xs text-amber-400">
                  Edited (v{study.version})
                </div>
              )}
            </div>
          ))}
        </div>

        {/* DICOM Viewer Area */}
        <div className="lg:col-span-2">
          {selectedStudy ? (
            <div className="glass rounded-xl border border-slate-800/50 overflow-hidden">
              {/* Viewer Header */}
              <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-primary">
                    {selectedStudy.studyType} - {selectedStudy.bodyPart}
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">{selectedStudy.date}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      if (selectedStudy.aiAnalysis) {
                        printRadiologyReport(
                          selectedStudy.aiAnalysis.findings || 'No findings available',
                          selectedStudy.aiAnalysis.findings || 'No impression available',
                          `${selectedStudy.studyType} - ${selectedStudy.bodyPart}`,
                          {
                            title: 'Radiology Report',
                            patientName: selectedStudy.patientName,
                            patientId: selectedStudy.patientId,
                            date: selectedStudy.date,
                          }
                        )
                      }
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/15 transition-colors"
                    title="Print Radiology Report (with prices)"
                  >
                    <Printer size={16} className="text-cyan-400" />
                    <span className="text-xs font-medium text-cyan-400">Print Report</span>
                  </button>
                  <button
                    onClick={() => {
                      printMedicalReport({
                        patientName: selectedStudy.patientName,
                        patientId: selectedStudy.patientId,
                        date: selectedStudy.date,
                        reportType: 'Radiology',
                        content: {
                          findings: selectedStudy.aiAnalysis?.findings || 'No findings available',
                          impression: selectedStudy.aiAnalysis?.findings || 'No impression available',
                        },
                        technicianName: 'Radiology Technician',
                      })
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-600/15 transition-colors"
                    title="Print Medical Report (no prices)"
                  >
                    <Printer size={16} className="text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-400">Print (no prices)</span>
                  </button>
                  <button className="p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-colors">
                    <ZoomIn size={16} className="text-secondary" />
                  </button>
                  <button className="p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-colors">
                    <Download size={16} className="text-secondary" />
                  </button>
                </div>
              </div>

              {/* DICOM Viewer Placeholder */}
              <div className="p-8 bg-slate-900/30 min-h-[500px] flex items-center justify-center">
                <div className="text-center">
                  <FileImage size={64} className="mx-auto mb-4 text-slate-600" />
                  <h4 className="text-sm font-semibold text-primary mb-2">DICOM Web Viewer</h4>
                  <p className="text-xs text-secondary mb-4 max-w-md">
                    {/* 
                      TODO: Integrate DICOM Web Viewer
                      Recommended libraries:
                      - dicom-parser: https://github.com/cornerstonejs/dicomParser
                      - cornerstone-core: https://github.com/cornerstonejs/cornerstone
                      - cornerstone-tools: https://github.com/cornerstonejs/cornerstoneTools
                      
                      Implementation steps:
                      1. Install: npm install dicom-parser cornerstone-core cornerstone-tools
                      2. Load DICOM file from server/cloud storage
                      3. Parse DICOM metadata using dicom-parser
                      4. Render image using cornerstone-core
                      5. Add tools (zoom, pan, window/level) using cornerstone-tools
                    */}
                    DICOM viewer integration placeholder. In production, this will display medical imaging
                    files (DICOM format) with zoom, pan, window/level adjustments, and measurement tools.
                  </p>
                  <div className="inline-block px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg text-xs">
                    DICOM Parser Integration Required
                  </div>
                </div>
              </div>

              {/* AI Analysis Section */}
              {selectedStudy.aiAnalysis && (
                <div className="p-4 border-t border-slate-800/50 bg-slate-900/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🤖</span>
                      <h4 className="text-sm font-semibold text-primary">AI Analysis</h4>
                      <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded text-xs">
                        {selectedStudy.aiAnalysis.confidence}% Confidence
                      </span>
                    </div>
                    {selectedStudy.aiAnalysis.risk === 'High' && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg">
                        <AlertTriangle size={14} />
                        <span className="text-xs font-semibold">URGENT</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-secondary">{selectedStudy.aiAnalysis.findings}</p>
                </div>
              )}

              {/* Version History */}
              {selectedStudy.editHistory && selectedStudy.editHistory.length > 0 && (
                <div className="p-4 border-t border-slate-800/50">
                  <h4 className="text-xs font-semibold text-primary mb-2">Edit History</h4>
                  <div className="space-y-2">
                    {selectedStudy.editHistory.map((edit, idx) => (
                      <div key={idx} className="p-2 bg-slate-800/30 rounded text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-secondary">v{edit.version} by {edit.editedBy}</span>
                          <span className="text-slate-500">{edit.editedAt}</span>
                        </div>
                        <p className="text-slate-400 italic">Previous: {edit.previousValue}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass rounded-xl border border-slate-800/50 p-12 text-center">
              <FileImage size={48} className="mx-auto mb-4 text-slate-600" />
              <p className="text-sm text-secondary">Select a study to view DICOM images</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

