'use client'

import { FlaskConical, ScanLine, Waves, Activity, CheckCircle2 } from 'lucide-react'
import { FaHourglassHalf, FaCheckCircle } from 'react-icons/fa'
import type { ERPatient, ResultCardType, Severity } from '@/types/er'
import { erVitalsEmergencyPulse } from '@/lib/emergency/vitalsAlert'

const iconShell =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-slate-600/60 bg-slate-900/90 shadow-inner mx-auto'
const iconClass = 'h-7 w-7 shrink-0 text-cyan-400'

type Props = {
  bedNum: number
  patient: ERPatient | undefined
  onOpenDrawer: (bedNum: number) => void
  onQuickRequest: (
    e: React.MouseEvent,
    patient: ERPatient,
    department: 'Lab' | 'Radiology' | 'Sonar' | 'ECG'
  ) => void
  onResultClick: (e: React.MouseEvent, type: ResultCardType, patient: ERPatient) => void
}

export default function ERPatientBedCard({
  bedNum,
  patient,
  onOpenDrawer,
  onQuickRequest,
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
  const showRr = Boolean(anyReady)
  const hasUnreadResults = Boolean(
    patient?.labUnreviewed || patient?.radiologyUnreviewed || patient?.sonarUnreviewed || patient?.ecgUnreviewed
  )

  return (
    <button
      type="button"
      onClick={() => onOpenDrawer(bedNum)}
      className={`relative min-h-[168px] overflow-hidden rounded-xl border text-left transition-all duration-200 flex flex-col ${
        isAvailable
          ? 'cursor-default border-slate-700/60 bg-slate-800/40 hover:bg-slate-800/60'
          : emergencyPulse
            ? 'border-red-500/70 bg-red-500/10 shadow-lg shadow-red-500/10 ring-1 ring-red-500/40 animate-pulse'
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
      {showRr ? (
        <div
          className={`pointer-events-none absolute z-10 inline-flex items-center gap-0.5 rounded-full bg-green-500/10 px-1 py-0.5 text-[9px] font-medium text-green-500 ${
            showWfr ? 'bottom-7 right-1.5' : 'bottom-1.5 right-1.5'
          }`}
        >
          <FaCheckCircle className="h-3 w-3 shrink-0" aria-hidden />
          <span>R.R</span>
        </div>
      ) : null}
      {hasUnreadResults ? (
        <div
          className="pointer-events-none absolute left-1.5 bottom-1.5 z-10 inline-flex items-center gap-1 rounded-full border border-cyan-400/60 bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-100"
          title="New unread result"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-200" />
          New Result
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

      <div className="flex flex-1 flex-col p-3">
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
            <div
              className="mt-2 grid grid-cols-4 gap-1.5 justify-items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                title="Lab request"
                onClick={(e) => onQuickRequest(e, patient, 'Lab')}
                className={iconShell}
              >
                <FlaskConical className={iconClass} aria-hidden />
              </button>
              <button
                type="button"
                title="X-ray request"
                onClick={(e) => onQuickRequest(e, patient, 'Radiology')}
                className={iconShell}
              >
                <ScanLine className={iconClass} aria-hidden />
              </button>
              <button
                type="button"
                title="Sonar request"
                onClick={(e) => onQuickRequest(e, patient, 'Sonar')}
                className={iconShell}
              >
                <Waves className={iconClass} aria-hidden />
              </button>
              <button
                type="button"
                title="ECG request"
                onClick={(e) => onQuickRequest(e, patient, 'ECG')}
                className={iconShell}
              >
                <Activity className={iconClass} aria-hidden />
              </button>
            </div>
            <div
              className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-[10px]"
              onClick={(e) => e.stopPropagation()}
            >
              <span
                title="Lab"
                onClick={(e) => onResultClick(e, 'Lab', patient)}
                className={`inline-flex cursor-pointer items-center gap-0.5 rounded px-1.5 py-0.5 transition-all ${
                  patient.labReady
                    ? `text-emerald-400 hover:bg-emerald-500/20 ${patient.labUnreviewed ? 'animate-pulse bg-emerald-500/15' : ''}`
                    : patient.hasLabRequest
                      ? 'cursor-default text-amber-400'
                      : 'cursor-default text-slate-500'
                }`}
              >
                Lab {patient.labReady ? 'R.R' : patient.hasLabRequest ? 'W.F.R' : '—'}
              </span>
              <span
                title="X-Ray"
                onClick={(e) => onResultClick(e, 'Radiology', patient)}
                className={`inline-flex cursor-pointer items-center gap-0.5 rounded px-1.5 py-0.5 transition-all ${
                  patient.radiologyReady
                    ? `text-emerald-400 hover:bg-emerald-500/20 ${patient.radiologyUnreviewed ? 'animate-pulse bg-emerald-500/15' : ''}`
                    : patient.hasRadiologyRequest
                      ? 'cursor-default text-amber-400'
                      : 'cursor-default text-slate-500'
                }`}
              >
                X-ray {patient.radiologyReady ? 'R.R' : patient.hasRadiologyRequest ? 'W.F.R' : '—'}
              </span>
              <span
                title="Sonar"
                onClick={(e) => onResultClick(e, 'Sonar', patient)}
                className={`inline-flex cursor-pointer items-center gap-0.5 rounded px-1.5 py-0.5 transition-all ${
                  patient.sonarReady
                    ? `text-emerald-400 hover:bg-emerald-500/20 ${patient.sonarUnreviewed ? 'animate-pulse bg-emerald-500/15' : ''}`
                    : patient.hasSonarRequest
                      ? 'cursor-default text-amber-400'
                      : 'cursor-default text-slate-500'
                }`}
              >
                Sonar {patient.sonarReady ? 'R.R' : patient.hasSonarRequest ? 'W.F.R' : '—'}
              </span>
              <span
                title="ECG"
                onClick={(e) => onResultClick(e, 'ECG', patient)}
                className={`inline-flex cursor-pointer items-center gap-0.5 rounded px-1.5 py-0.5 transition-all ${
                  patient.ecgReady
                    ? `text-emerald-400 hover:bg-emerald-500/20 ${patient.ecgUnreviewed ? 'animate-pulse bg-emerald-500/15' : ''}`
                    : patient.hasEcgRequest
                      ? 'cursor-default text-amber-400'
                      : 'cursor-default text-slate-500'
                }`}
              >
                ECG {patient.ecgReady ? 'R.R' : patient.hasEcgRequest ? 'W.F.R' : '—'}
              </span>
            </div>
          </>
        )}
      </div>
    </button>
  )
}
