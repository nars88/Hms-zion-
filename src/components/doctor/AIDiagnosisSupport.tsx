'use client'

import { useState, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface AIDiagnosisSupportProps {
  symptoms: string
  onDiagnosisSelect: (diagnosis: string) => void
}

// Mock AI suggestions - In production, this would call an AI API
const generateAISuggestions = (symptoms: string) => {
  const lowerSymptoms = symptoms.toLowerCase()
  
  const suggestions = []
  const labTests = []

  // Simple pattern matching for demo - replace with actual AI in production
  if (lowerSymptoms.includes('chest pain') || lowerSymptoms.includes('shortness of breath')) {
    suggestions.push({
      diagnosis: 'Acute Coronary Syndrome',
      confidence: 'High',
      reasoning: 'Chest pain with shortness of breath suggests cardiac involvement',
    })
    suggestions.push({
      diagnosis: 'Pulmonary Embolism',
      confidence: 'Medium',
      reasoning: 'Consider PE if patient has risk factors',
    })
    labTests.push('ECG', 'Troponin', 'D-Dimer', 'Chest X-Ray')
  }

  if (lowerSymptoms.includes('fever') && lowerSymptoms.includes('cough')) {
    suggestions.push({
      diagnosis: 'Upper Respiratory Tract Infection',
      confidence: 'High',
      reasoning: 'Fever with cough is consistent with URTI',
    })
    suggestions.push({
      diagnosis: 'Pneumonia',
      confidence: 'Medium',
      reasoning: 'Consider pneumonia if symptoms persist or worsen',
    })
    labTests.push('CBC', 'Chest X-Ray', 'Sputum Culture')
  }

  if (lowerSymptoms.includes('headache') && (lowerSymptoms.includes('nausea') || lowerSymptoms.includes('photophobia'))) {
    suggestions.push({
      diagnosis: 'Migraine',
      confidence: 'High',
      reasoning: 'Classic migraine presentation with photophobia',
    })
    suggestions.push({
      diagnosis: 'Tension Headache',
      confidence: 'Medium',
      reasoning: 'Consider tension headache if no aura present',
    })
    labTests.push('CT Head (if severe)', 'Blood Pressure Monitoring')
  }

  // Default suggestions if no match
  if (suggestions.length === 0) {
    suggestions.push({
      diagnosis: 'Further Evaluation Required',
      confidence: 'Low',
      reasoning: 'Additional history and examination needed',
    })
    labTests.push('CBC', 'Basic Metabolic Panel')
  }

  return { suggestions, labTests }
}

export default function AIDiagnosisSupport({ symptoms, onDiagnosisSelect }: AIDiagnosisSupportProps) {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [labTests, setLabTests] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true) // Collapsed by default
  const [verifiedDiagnoses, setVerifiedDiagnoses] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (symptoms) {
      setIsLoading(true)
      // Simulate AI processing delay
      setTimeout(() => {
        const result = generateAISuggestions(symptoms)
        setSuggestions(result.suggestions)
        setLabTests(result.labTests)
        setIsLoading(false)
      }, 800)
    }
  }, [symptoms])

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'High':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'Medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'Low':
        return 'bg-slate-800/50 text-slate-400 border-slate-700/50'
      default:
        return 'bg-slate-800/50 text-slate-400 border-slate-700/50'
    }
  }

  const handleVerify = (diagnosis: string) => {
    const newVerified = new Set(verifiedDiagnoses)
    if (newVerified.has(diagnosis)) {
      newVerified.delete(diagnosis)
    } else {
      newVerified.add(diagnosis)
    }
    setVerifiedDiagnoses(newVerified)
    onDiagnosisSelect(diagnosis)
  }

  return (
    <div className="glass rounded-xl border border-slate-800/50 overflow-hidden">
      {/* Header - Collapsible */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full p-5 flex items-center justify-between hover:bg-slate-800/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <h3 className="text-sm font-semibold text-primary">AI Diagnosis Support</h3>
          <span className="ml-2 px-2 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded text-xs font-medium">
            AI-Powered
          </span>
        </div>
        <ChevronDown
          size={18}
          className={`text-secondary transition-transform duration-200 ${
            isCollapsed ? '' : 'rotate-180'
          }`}
        />
      </button>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <div className="px-5 pb-5">
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-cyan-500 border-t-transparent mb-2"></div>
              <p className="text-xs text-secondary">Analyzing symptoms...</p>
            </div>
          ) : (
            <>
              {/* Suggested Diagnoses */}
              <div className="mb-5">
                <p className="text-xs text-secondary mb-3 font-medium">Suggested Diagnoses</p>
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => {
                    const isVerified = verifiedDiagnoses.has(suggestion.diagnosis)
                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border transition-all ${
                          isVerified
                            ? 'border-emerald-500/40 bg-emerald-500/5'
                            : 'border-slate-800/50 hover:border-cyan-500/30 hover:bg-cyan-500/5'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-sm font-medium transition-colors ${
                                  isVerified ? 'text-emerald-400' : 'text-primary'
                                }`}
                              >
                                {suggestion.diagnosis}
                              </span>
                              {isVerified && (
                                <span className="text-xs text-emerald-400">✓ Verified</span>
                              )}
                            </div>
                            <p className="text-xs text-secondary mt-1">{suggestion.reasoning}</p>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium border ${getConfidenceColor(
                                suggestion.confidence
                              )}`}
                            >
                              {suggestion.confidence}
                            </span>
                            <button
                              onClick={() => handleVerify(suggestion.diagnosis)}
                              className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                                isVerified
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/15'
                              }`}
                            >
                              {isVerified ? '✓ Verified' : 'Verify'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Recommended Lab Tests */}
              {labTests.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-secondary mb-3 font-medium">Recommended Lab Tests</p>
                  <div className="flex flex-wrap gap-2">
                    {labTests.map((test, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-xs text-primary"
                      >
                        {test}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <div className="pt-4 border-t border-slate-800/30">
                <p className="text-xs text-slate-500 italic text-center">
                  ⚠️ AI suggestions are for supportive purposes only. Final diagnosis should be based on clinical judgment.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

