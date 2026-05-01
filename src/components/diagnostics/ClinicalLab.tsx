'use client'

import { useState } from 'react'
import { AlertTriangle, Edit2, History, CheckCircle2, Printer } from 'lucide-react'
import { printLabResults } from '@/lib/printUtils'
import { printMedicalReport } from '@/lib/medicalReportPrint'

interface LabTest {
  id: string
  testName: string
  loincCode: string // LOINC code for international compatibility
  category: 'Hematology' | 'Chemistry' | 'Virology' | 'Microbiology'
  value: string
  unit: string
  referenceRange: string
  status: 'Normal' | 'Abnormal' | 'Critical' | 'Urgent'
  patientName: string
  patientId: string
  date: string
  version: number
  editedBy?: string
  editedAt?: string
  editHistory?: Array<{
    version: number
    editedBy: string
    editedAt: string
    previousValue: string
    newValue: string
    reason?: string
  }>
  aiAnalysis?: {
    findings: string
    risk: 'Low' | 'Medium' | 'High'
    confidence: number
  }
}

/** UI-only demo: one flagship test per patient = two patients in the list (no DB). */
const mockLabResults: LabTest[] = [
  {
    id: 'dx-lab-mock-1',
    testName: 'Complete Blood Count (CBC)',
    loincCode: '58410-2',
    category: 'Hematology',
    value: '6.2',
    unit: 'x10^9/L',
    referenceRange: '4.0-11.0',
    status: 'Normal',
    patientName: 'Test Patient A - Demo Alpha',
    patientId: 'DX-MOCK-LAB-01',
    date: '2026-04-24 08:45',
    version: 1,
    aiAnalysis: {
      findings: 'CBC within expected range (demo).',
      risk: 'Low',
      confidence: 93,
    },
  },
  {
    id: 'dx-lab-mock-2',
    testName: 'Glucose (Fasting)',
    loincCode: '2339-0',
    category: 'Chemistry',
    value: '118',
    unit: 'mg/dL',
    referenceRange: '70-100',
    status: 'Abnormal',
    patientName: 'Test Patient B - Demo Beta',
    patientId: 'DX-MOCK-LAB-02',
    date: '2026-04-24 10:20',
    version: 1,
    aiAnalysis: {
      findings: 'Mild elevation vs reference — follow-up per protocol (demo).',
      risk: 'Medium',
      confidence: 86,
    },
  },
]

export default function ClinicalLab() {
  const [selectedTest, setSelectedTest] = useState<LabTest | null>(mockLabResults[0])
  const [filter, setFilter] = useState<'All' | 'Hematology' | 'Chemistry' | 'Virology' | 'Microbiology'>('All')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const filteredResults = filter === 'All'
    ? mockLabResults
    : mockLabResults.filter(r => r.category === filter)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Urgent':
      case 'Critical':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
      case 'Abnormal':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'Normal':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
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

  const isValueAbnormal = (test: LabTest) => {
    return test.status === 'Urgent' || test.status === 'Critical' || test.status === 'Abnormal'
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with Filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-primary">Clinical Laboratory Results</h2>
          <p className="text-xs text-secondary mt-1">HL7/LOINC compatible lab results with audit logging</p>
        </div>
        <div className="flex items-center gap-2">
          {(['All', 'Hematology', 'Chemistry', 'Virology', 'Microbiology'] as const).map((f) => (
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
        {/* Results List */}
        <div className="lg:col-span-1 space-y-3">
          {filteredResults.map((test) => {
            const isAbnormal = isValueAbnormal(test)
            return (
              <div
                key={test.id}
                onClick={() => setSelectedTest(test)}
                className={`glass rounded-xl border p-4 cursor-pointer transition-all ${
                  selectedTest?.id === test.id
                    ? 'border-cyan-500/40 bg-cyan-500/5'
                    : isAbnormal
                    ? 'border-rose-500/30 bg-rose-500/5'
                    : 'border-slate-800/50 hover:border-slate-700/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-primary">{test.patientName}</h3>
                    <p className="text-xs text-secondary mt-0.5">{test.patientId}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(test.status)}`}>
                    {test.status}
                  </span>
                </div>
                <div className="mb-2">
                  <p className="text-xs font-medium text-primary">{test.testName}</p>
                  <div className="flex items-center gap-3 text-xs text-secondary mt-1">
                    <span>{test.value} {test.unit}</span>
                    {isAbnormal && (
                      <span className="flex items-center gap-1 text-rose-400">
                        <AlertTriangle size={10} />
                        URGENT
                      </span>
                    )}
                  </div>
                </div>
                {test.version > 1 && (
                  <div className="mt-2 pt-2 border-t border-slate-800/30 flex items-center gap-2">
                    <Edit2 size={10} className="text-amber-400" />
                    <span className="text-xs text-amber-400">Edited (v{test.version})</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Test Details */}
        <div className="lg:col-span-2">
          {selectedTest ? (
            <div className="glass rounded-xl border border-slate-800/50 overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-slate-800/50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-primary">{selectedTest.testName}</h3>
                    <p className="text-xs text-secondary mt-0.5">{selectedTest.date}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedTest.version > 1 && (
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-colors"
                        title="View Edit History"
                      >
                        <History size={16} className="text-secondary" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        printLabResults(
                          [{
                            testName: selectedTest.testName,
                            result: `${selectedTest.value} ${selectedTest.unit}`,
                            referenceRange: selectedTest.referenceRange,
                            status: selectedTest.status,
                          }],
                          {
                            title: 'Laboratory Test Results',
                            patientName: selectedTest.patientName,
                            patientId: selectedTest.patientId,
                            date: selectedTest.date,
                          }
                        )
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/15 transition-colors"
                      title="Print Lab Results (with prices)"
                    >
                      <Printer size={16} className="text-cyan-400" />
                      <span className="text-xs font-medium text-cyan-400">Print Report</span>
                    </button>
                    <button
                      onClick={() => {
                        printMedicalReport({
                          patientName: selectedTest.patientName,
                          patientId: selectedTest.patientId,
                          date: selectedTest.date,
                          reportType: 'Lab',
                          content: {
                            testResults: [{
                              testName: selectedTest.testName,
                              result: `${selectedTest.value} ${selectedTest.unit}`,
                              referenceRange: selectedTest.referenceRange,
                              status: selectedTest.status,
                            }],
                          },
                          technicianName: 'Lab Technician',
                        })
                      }}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-600/15 transition-colors"
                      title="Print Medical Report (no prices)"
                    >
                      <Printer size={16} className="text-emerald-400" />
                      <span className="text-xs font-medium text-emerald-400">Print (no prices)</span>
                    </button>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/15 transition-colors"
                      title="Edit Result"
                    >
                      <Edit2 size={16} className="text-cyan-400" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${getStatusColor(selectedTest.status)}`}>
                    {selectedTest.status}
                  </span>
                  {isValueAbnormal(selectedTest) && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg">
                      <AlertTriangle size={14} />
                      <span className="text-xs font-semibold">URGENT - OUT OF RANGE</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Test Details */}
              <div className="p-6 space-y-6">
                {/* Patient Info */}
                <div>
                  <p className="text-xs text-secondary mb-2">Patient Information</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-secondary">Name</p>
                      <p className="text-sm font-medium text-primary">{selectedTest.patientName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-secondary">Patient ID</p>
                      <p className="text-sm font-medium text-primary">{selectedTest.patientId}</p>
                    </div>
                  </div>
                </div>

                {/* Test Results */}
                <div className="p-4 bg-slate-900/30 rounded-lg border border-slate-800/30">
                  <p className="text-xs text-secondary mb-3">Test Result</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-secondary mb-1">Value</p>
                      <p className={`text-2xl font-bold ${isValueAbnormal(selectedTest) ? 'text-rose-400' : 'text-primary'}`}>
                        {selectedTest.value}
                      </p>
                      <p className="text-xs text-secondary mt-1">{selectedTest.unit}</p>
                    </div>
                    <div>
                      <p className="text-xs text-secondary mb-1">Reference Range</p>
                      <p className="text-sm font-medium text-primary">{selectedTest.referenceRange}</p>
                    </div>
                    <div>
                      <p className="text-xs text-secondary mb-1">Category</p>
                      <p className="text-sm font-medium text-primary">{selectedTest.category}</p>
                    </div>
                  </div>
                </div>

                {/* LOINC Code (Metadata) */}
                <div className="p-4 bg-slate-900/30 rounded-lg border border-slate-800/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-secondary mb-1">LOINC Code</p>
                      <p className="text-sm font-mono text-primary">{selectedTest.loincCode}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {/* 
                          LOINC (Logical Observation Identifiers Names and Codes) is a standard for
                          identifying laboratory and clinical observations. This code ensures
                          compatibility with international lab machines and HL7 messaging systems.
                          
                          Integration notes:
                          - Store LOINC codes in database metadata field
                          - Use for HL7 message generation
                          - Map to lab machine protocols
                          - Enable interoperability with external systems
                        */}
                        Standard code for international lab compatibility (HL7/LOINC)
                      </p>
                    </div>
                    <div className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg text-xs">
                      HL7 Compatible
                    </div>
                  </div>
                </div>

                {/* Version Info */}
                {selectedTest.version > 1 && (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Edit2 size={14} className="text-amber-400" />
                      <p className="text-xs font-semibold text-amber-400">Result Edited</p>
                    </div>
                    <div className="text-xs text-secondary space-y-1">
                      <p>Version: {selectedTest.version}</p>
                      {selectedTest.editedBy && <p>Edited by: {selectedTest.editedBy}</p>}
                      {selectedTest.editedAt && <p>Edited at: {selectedTest.editedAt}</p>}
                    </div>
                  </div>
                )}

                {/* Edit History */}
                {showHistory && selectedTest.editHistory && selectedTest.editHistory.length > 0 && (
                  <div className="p-4 bg-slate-900/30 rounded-lg border border-slate-800/30">
                    <div className="flex items-center gap-2 mb-3">
                      <History size={14} className="text-secondary" />
                      <p className="text-xs font-semibold text-primary">Audit Log - Edit History</p>
                    </div>
                    <div className="space-y-3">
                      {selectedTest.editHistory.map((edit, idx) => (
                        <div key={idx} className="p-3 bg-slate-800/30 rounded border border-slate-700/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-primary">Version {edit.version}</span>
                            <span className="text-xs text-secondary">{edit.editedAt}</span>
                          </div>
                          <div className="text-xs text-secondary space-y-1">
                            <p>Edited by: {edit.editedBy}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-slate-500">Previous:</span>
                              <span className="line-through text-rose-400">{edit.previousValue}</span>
                              <span className="text-slate-500">→</span>
                              <span className="text-emerald-400">{edit.newValue}</span>
                            </div>
                            {edit.reason && (
                              <p className="mt-2 italic text-slate-500">Reason: {edit.reason}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Analysis */}
                {selectedTest.aiAnalysis && (
                  <div className="p-4 border-t border-slate-800/50 bg-slate-900/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🤖</span>
                        <h4 className="text-sm font-semibold text-primary">AI Analysis</h4>
                        <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded text-xs">
                          {selectedTest.aiAnalysis.confidence}% Confidence
                        </span>
                      </div>
                      {selectedTest.aiAnalysis.risk === 'High' && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg">
                          <AlertTriangle size={14} />
                          <span className="text-xs font-semibold">URGENT</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-secondary">{selectedTest.aiAnalysis.findings}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass rounded-xl border border-slate-800/50 p-12 text-center">
              <p className="text-sm text-secondary">Select a test result to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

