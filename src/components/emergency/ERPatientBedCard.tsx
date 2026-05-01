'use client'

import { FlaskConical, ScanLine, Waves, Activity, CheckCircle2 } from 'lucide-react'
import { FaHourglassHalf, FaCheckCircle } from 'react-icons/fa'
import type { ERPatient, ResultCardType, Severity } from '@/types/er'
import { erVitalsEmergencyPulse } from '@/lib/emergency/vitalsAlert'

const iconShell =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-slate-600/60 bg-slate-900/90 shadow-inner'
const iconClass = 'h-7 w-7 shrink-0 text-cyan-400'

type Props = {
  bedNum: number
  patient: ERPatient | undefined
  /** Live “result just released” pulse (BroadcastChannel / poll) — distinct from unread badge. */
  liveResultReadyHighlight?: boolean
  onOpenDrawer: (bedNum: number) => void
  onResultClick: (e: React.MouseEvent, type: ResultCardType, patient: ERPatient) => void
}

export default function ERPatientBedCard({
  bedNum,
  patient,
  liveResultReadyHighlight,
  onOpenDrawer,
  onResultClick,
}: Props) {
  const isAvailable = !patient
  const severity: Severity =
    patient?.triageLevel === 1 ? 'Red' : patient?.triageLevel === 2 ? 'Yellow' : 'Green'
  const emergencyPulse = patient ? erVitalsEmergencyPulse(patient.vitals, patient.triageLevel) : false

  const pendingResults =
    patient &&
    (Boolean(patient.hasLabRequest) ||
      Boolean(patient.hasRadiologyRequest) ||
      Boolean(patient.hasSonarRequest) ||
      Boolean(patient.hasEcgRequest))
  const anyReady =
    patient &&
    (Boolean(patient.labReady) ||
      Boolean(patient.radiologyReady) ||
      Boolean(patient.sonarReady) ||
      Boolean(patient.ecgReady))
  const showWfr = Boolean(pendingResults)
  const hasUnreadResults = Boolean(
    patient?.labUnreviewed || patient?.radiologyUnreviewed || patient?.sonarUnreviewed || patient?.ecgUnreviewed
  )
  const liveGlow = Boolean(patient && liveResultReadyHighlight && !emergencyPulse)
  const showLabDiagnostics = Boolean(patient && (patient.hasLabRequest || patient.labReady || patient.labUnreviewed))
  const showRadiologyDiagnostics = Boolean(
    patient && (patient.hasRadiologyRequest || patient.radiologyReady || patient.radiologyUnreviewed)
  )
  const showSonarDiagnostics = Boolean(patient && (patient.hasSonarRequest || patient.sonarReady || patient.sonarUnreviewed))
  const showEcgDiagnostics = Boolean(patient && (patient.hasEcgRequest || patient.ecgReady || patient.ecgUnreviewed))

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open bed ${bedNum} details`}
      onClick={() => onOpenDrawer(bedNum)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenDrawer(bedNum)
        }
      }}
      className={`relative min-h-[168px] overflow-hidden rounded-xl border text-left transition-all duration-200 flex flex-col ${
        isAvailable
          ? 'cursor-default border-slate-700/60 bg-slate-800/40 hover:bg-slate-800/60'
          : emergencyPulse
            ? 'border-red-500/70 bg-red-500/10 shadow-lg shadow-red-500/10 ring-1 ring-red-500/40 animate-pulse'
            : liveGlow
              ? 'border-violet-400/85 bg-violet-500/12 shadow-lg shadow-violet-500/25 ring-2 ring-violet-400/55 animate-pulse'
            : hasUnreadResults
              ? 'border-cyan-400/70 bg-cyan-500/10 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/50'
            : severity === 'Red'
              ? 'border-red-500/40 bg-red-500/15 hover:bg-red-500/20'
              : severity === 'Yellow'
                ? 'border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/20'
                : 'border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/20'
      }`}
    >
      {showWfr ? (
        <div className="pointer-events-none absolute bottom-1.5 right-1.5 z-10 inline-flex items-center gap-0.5 rounded-full bg-yellow-500/10 px-1 py-0.5 text-[9px] font-medium text-yellow-400">
          <FaHourglassHalf className="h-3 w-3 shrink-0" aria-hidden />
          <span>W.F.R</span>
        </div>
      ) : null}
      {liveGlow ? (
        <div
          className="pointer-events-none absolute left-1.5 bottom-1.5 z-10 inline-flex items-center gap-1 rounded-full border border-violet-400/70 bg-violet-500/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-violet-100"
          title="Result ready"
        >
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-violet-200 shadow-[0_0_8px_rgba(196,181,253,0.9)]" />
          Result Ready
        </div>
      ) : null}
      {patient?.nurseTasksComplete ? (
        <div
          className="pointer-events-none absolute left-1.5 top-1.5 z-10 inline-flex items-center gap-0.5 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300"
          title="Nurse tasks complete"
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </div>
      ) : null}
      {patient?.criticalAlert ? (
        <div
          className="pointer-events-none absolute right-1.5 top-1.5 z-10 inline-flex animate-pulse items-center gap-1 rounded-full border border-rose-400/70 bg-rose-500/25 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-100"
          title="High Priority"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-200" />
          High Priority
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-4 p-6">
        {!liveGlow && hasUnreadResults ? (
          <div
            className="inline-flex w-fit items-center gap-1 rounded-full border border-cyan-400/60 bg-cyan-500/20 px-2 py-1 text-[10px] font-semibold text-cyan-100"
            title="New unread result"
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-200" />
            New Result
          </div>
        ) : null}
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400">Bed {bedNum}</span>
          {!isAvailable && (
            <span
              className={`inline-flex rounded px-2 py-0.5 text-[10px] font-medium ${
                severity === 'Red'
                  ? 'bg-red-500/30 text-red-200'
                  : severity === 'Yellow'
                    ? 'bg-amber-500/30 text-amber-200'
                    : 'bg-emerald-500/30 text-emerald-200'
              }`}
            >
              {severity}
            </span>
          )}
        </div>
        {isAvailable ? (
          <span className="text-sm text-slate-500">Available</span>
        ) : (
          <>
            <span className="truncate text-sm font-semibold text-slate-100">{patient.name}</span>
            <span className="mt-1 line-clamp-2 text-xs text-slate-400">{patient.chiefComplaint || '—'}</span>
            {patient.vitals ? (
              <p className="mt-2 text-[10px] leading-snug text-slate-300">
                BP {patient.vitals.bp} · {patient.vitals.temperature}°C · HR {patient.vitals.heartRate}
                {patient.vitals.spo2 != null && patient.vitals.spo2 !== undefined
                  ? ` · SpO₂ ${patient.vitals.spo2}%`
                  : ''}
              </p>
            ) : (
              <p className="mt-2 text-[10px] text-amber-400/90">Vitals pending</p>
            )}
            {(showLabDiagnostics || showRadiologyDiagnostics || showSonarDiagnostics || showEcgDiagnostics) && (
              <>
                <div className="mt-4 mb-2 flex flex-wrap items-center gap-4" onClick={(e) => e.stopPropagation()}>
                  {showLabDiagnostics && (
                    <div className="relative">
                      <button
                        type="button"
                        title={patient.labReady ? 'Open Lab Result' : 'Lab requested'}
                        onClick={(e) => {
                          if (patient.labReady) onResultClick(e, 'Lab', patient)
                        }}
                        className={`${iconShell} ${
                          patient.labReady
                            ? 'cursor-pointer transition-transform hover:scale-105 border-emerald-500/60 bg-emerald-500/10'
                            : 'cursor-default opacity-80'
                        }`}
                      >
                        <FlaskConical className={iconClass} aria-hidden />
                      </button>
                      {patient.labUnreviewed ? (
                        <span className="pointer-events-none absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-cyan-400 ring-2 ring-slate-950" />
                      ) : null}
                    </div>
                  )}
                  {showRadiologyDiagnostics && (
                    <div className="relative">
                      <button
                        type="button"
                        title={patient.radiologyReady ? 'Open X-Ray Result' : 'X-Ray requested'}
                        onClick={(e) => {
                          if (patient.radiologyReady) onResultClick(e, 'Radiology', patient)
                        }}
                        className={`${iconShell} ${
                          patient.radiologyReady
                            ? 'cursor-pointer transition-transform hover:scale-105 border-emerald-500/60 bg-emerald-500/10'
                            : 'cursor-default opacity-80'
                        }`}
                      >
                        <ScanLine className={iconClass} aria-hidden />
                      </button>
                      {patient.radiologyUnreviewed ? (
                        <span className="pointer-events-none absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-cyan-400 ring-2 ring-slate-950" />
                      ) : null}
                    </div>
                  )}
                  {showSonarDiagnostics && (
                    <div className="relative">
                      <button
                        type="button"
                        title={patient.sonarReady ? 'Open Sonar Result' : 'Sonar requested'}
                        onClick={(e) => {
                          if (patient.sonarReady) onResultClick(e, 'Sonar', patient)
                        }}
                        className={`${iconShell} ${
                          patient.sonarReady
                            ? 'cursor-pointer transition-transform hover:scale-105 border-emerald-500/60 bg-emerald-500/10'
                            : 'cursor-default opacity-80'
                        }`}
                      >
                        <Waves className={iconClass} aria-hidden />
                      </button>
                      {patient.sonarUnreviewed ? (
                        <span className="pointer-events-none absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-cyan-400 ring-2 ring-slate-950" />
                      ) : null}
                    </div>
                  )}
                  {showEcgDiagnostics && (
                    <div className="relative">
                      <button
                        type="button"
                        title={patient.ecgReady ? 'Open ECG Result' : 'ECG requested'}
                        onClick={(e) => {
                          if (patient.ecgReady) onResultClick(e, 'ECG', patient)
                        }}
                        className={`${iconShell} ${
                          patient.ecgReady
                            ? 'cursor-pointer transition-transform hover:scale-105 border-emerald-500/60 bg-emerald-500/10'
                            : 'cursor-default opacity-80'
                        }`}
                      >
                        <Activity className={iconClass} aria-hidden />
                      </button>
                      {patient.ecgUnreviewed ? (
                        <span className="pointer-events-none absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-cyan-400 ring-2 ring-slate-950" />
                      ) : null}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
