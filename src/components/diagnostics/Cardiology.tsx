'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AlertTriangle, Play, Pause, Download } from 'lucide-react'

interface ECGReading {
  id: string
  patientName: string
  patientId: string
  date: string
  duration: number // seconds
  rhythm: 'Normal Sinus' | 'Atrial Fibrillation' | 'Ventricular Tachycardia' | 'Bradycardia'
  heartRate: number
  status: 'Normal' | 'Abnormal' | 'Urgent'
  waveformData: Array<{ time: number; value: number }>
  aiAnalysis?: {
    findings: string
    arrhythmia: boolean
    confidence: number
  }
  version?: number
  editedBy?: string
}

// Generate mock ECG waveform data
const generateECGWaveform = (duration: number = 10, heartRate: number = 72) => {
  const data = []
  const samplesPerSecond = 250 // Standard ECG sampling rate
  const totalSamples = duration * samplesPerSecond
  const period = (60 / heartRate) * samplesPerSecond // samples per heartbeat

  for (let i = 0; i < totalSamples; i++) {
    const time = i / samplesPerSecond
    const phase = (i % period) / period
    
    // Simulate ECG waveform (P wave, QRS complex, T wave)
    let value = 0
    if (phase < 0.1) {
      // P wave
      value = 0.2 * Math.sin(phase * Math.PI * 10)
    } else if (phase < 0.15) {
      // PR segment
      value = 0
    } else if (phase < 0.25) {
      // QRS complex
      value = 1.5 * Math.sin((phase - 0.15) * Math.PI * 20)
    } else if (phase < 0.35) {
      // ST segment
      value = 0
    } else if (phase < 0.5) {
      // T wave
      value = 0.3 * Math.sin((phase - 0.35) * Math.PI * 6.67)
    } else {
      // Rest
      value = 0
    }
    
    // Add some noise
    value += (Math.random() - 0.5) * 0.05
    
    data.push({ time: parseFloat(time.toFixed(2)), value: parseFloat(value.toFixed(3)) })
  }
  
  return data
}

const mockECGReadings: ECGReading[] = [
  {
    id: '1',
    patientName: 'John Doe',
    patientId: 'P001',
    date: '2024-01-15 10:30',
    duration: 10,
    rhythm: 'Normal Sinus',
    heartRate: 72,
    status: 'Normal',
    waveformData: generateECGWaveform(10, 72),
    aiAnalysis: {
      findings: 'Normal sinus rhythm detected',
      arrhythmia: false,
      confidence: 95,
    },
    version: 1,
  },
  {
    id: '2',
    patientName: 'Jane Smith',
    patientId: 'P002',
    date: '2024-01-15 09:15',
    duration: 10,
    rhythm: 'Atrial Fibrillation',
    heartRate: 110,
    status: 'Urgent',
    waveformData: generateECGWaveform(10, 110),
    aiAnalysis: {
      findings: 'Arrhythmia detected: Atrial Fibrillation',
      arrhythmia: true,
      confidence: 88,
    },
    version: 1,
  },
  {
    id: '3',
    patientName: 'Robert Johnson',
    patientId: 'P003',
    date: '2024-01-15 11:00',
    duration: 10,
    rhythm: 'Bradycardia',
    heartRate: 45,
    status: 'Abnormal',
    waveformData: generateECGWaveform(10, 45),
    aiAnalysis: {
      findings: 'Bradycardia detected - Heart rate below normal range',
      arrhythmia: true,
      confidence: 92,
    },
    version: 1,
  },
]

export default function Cardiology() {
  const [selectedReading, setSelectedReading] = useState<ECGReading | null>(mockECGReadings[0])
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)

  useEffect(() => {
    if (isPlaying && selectedReading) {
      const interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= selectedReading.duration) {
            setIsPlaying(false)
            return 0
          }
          return prev + 0.1
        })
      }, 100)
      return () => clearInterval(interval)
    }
  }, [isPlaying, selectedReading])

  const handleAIAnalysis = () => {
    setAiAnalyzing(true)
    setTimeout(() => {
      setAiAnalyzing(false)
      // In production, this would call an AI API
    }, 2000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Urgent':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30'
      case 'Abnormal':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
      case 'Normal':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      default:
        return 'bg-slate-800/50 text-slate-400 border-slate-700/50'
    }
  }

  // Filter waveform data based on current time for "live" playback
  const displayedData = selectedReading
    ? selectedReading.waveformData.filter((d) => d.time <= currentTime)
    : []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-primary">Cardiology - ECG/EKG Analysis</h2>
          <p className="text-xs text-secondary mt-1">Real-time heart rhythm monitoring and analysis</p>
        </div>
        {selectedReading && (
          <button
            onClick={handleAIAnalysis}
            disabled={aiAnalyzing}
            className="px-4 py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg hover:bg-cyan-500/15 transition-all text-sm font-medium disabled:opacity-50"
          >
            {aiAnalyzing ? 'Analyzing...' : '🤖 Run AI Analysis'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Readings List */}
        <div className="lg:col-span-1 space-y-3">
          {mockECGReadings.map((reading) => (
            <div
              key={reading.id}
              onClick={() => {
                setSelectedReading(reading)
                setCurrentTime(0)
                setIsPlaying(false)
              }}
              className={`glass rounded-xl border p-4 cursor-pointer transition-all ${
                selectedReading?.id === reading.id
                  ? 'border-cyan-500/40 bg-cyan-500/5'
                  : 'border-slate-800/50 hover:border-slate-700/50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-primary">{reading.patientName}</h3>
                  <p className="text-xs text-secondary mt-0.5">{reading.patientId}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(reading.status)}`}>
                  {reading.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-secondary mb-2">
                <span>HR: {reading.heartRate} bpm</span>
                <span>•</span>
                <span>{reading.rhythm}</span>
              </div>
              {reading.aiAnalysis?.arrhythmia && (
                <div className="mt-2 pt-2 border-t border-slate-800/30 flex items-center gap-2">
                  <AlertTriangle size={12} className="text-rose-400" />
                  <span className="text-xs text-rose-400 font-medium">Arrhythmia Detected</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ECG Waveform Viewer */}
        <div className="lg:col-span-2">
          {selectedReading ? (
            <div className="glass rounded-xl border border-slate-800/50 overflow-hidden">
              {/* Viewer Header */}
              <div className="p-4 border-b border-slate-800/50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-primary">ECG Waveform</h3>
                  <p className="text-xs text-secondary mt-0.5">
                    {selectedReading.date} • {selectedReading.duration}s duration
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    {isPlaying ? <Pause size={16} className="text-secondary" /> : <Play size={16} className="text-secondary" />}
                  </button>
                  <button className="p-2 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 transition-colors">
                    <Download size={16} className="text-secondary" />
                  </button>
                </div>
              </div>

              {/* ECG Chart */}
              <div className="p-6 bg-slate-900/30">
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={isPlaying ? displayedData : selectedReading.waveformData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis 
                      dataKey="time" 
                      stroke="#94A3B8"
                      style={{ fontSize: '12px' }}
                      label={{ value: 'Time (s)', position: 'insideBottom', offset: -5, fill: '#94A3B8' }}
                    />
                    <YAxis 
                      stroke="#94A3B8"
                      style={{ fontSize: '12px' }}
                      label={{ value: 'Amplitude (mV)', angle: -90, position: 'insideLeft', fill: '#94A3B8' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1E293B',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        color: '#F1F5F9',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#06B6D4"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* ECG Metrics */}
              <div className="p-4 border-t border-slate-800/50 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-secondary mb-1">Heart Rate</p>
                  <p className="text-lg font-semibold text-primary">{selectedReading.heartRate} bpm</p>
                </div>
                <div>
                  <p className="text-xs text-secondary mb-1">Rhythm</p>
                  <p className="text-lg font-semibold text-primary">{selectedReading.rhythm}</p>
                </div>
                <div>
                  <p className="text-xs text-secondary mb-1">Duration</p>
                  <p className="text-lg font-semibold text-primary">{selectedReading.duration}s</p>
                </div>
              </div>

              {/* AI Analysis */}
              {selectedReading.aiAnalysis && (
                <div className="p-4 border-t border-slate-800/50 bg-slate-900/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🤖</span>
                      <h4 className="text-sm font-semibold text-primary">AI Analysis</h4>
                      <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded text-xs">
                        {selectedReading.aiAnalysis.confidence}% Confidence
                      </span>
                    </div>
                    {selectedReading.aiAnalysis.arrhythmia && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg">
                        <AlertTriangle size={14} />
                        <span className="text-xs font-semibold">URGENT</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-secondary">{selectedReading.aiAnalysis.findings}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="glass rounded-xl border border-slate-800/50 p-12 text-center">
              <p className="text-sm text-secondary">Select an ECG reading to view waveform</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

