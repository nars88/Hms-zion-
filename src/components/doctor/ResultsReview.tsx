'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  FlaskConical,
  Info,
  ScanLine,
  Waves,
} from 'lucide-react'

type DashboardTab = 'exam' | 'results'

export default function ResultsReview() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('results')

  return (
    <>
      <style>{`
        @keyframes results-review-sonar-ring {
          0%, 100% { opacity: 0.2; transform: scale(0.95); }
          50% { opacity: 0.5; transform: scale(1); }
        }
        .results-review-sonar-ring-1 {
          animation: results-review-sonar-ring 2s ease-in-out infinite;
          animation-delay: 0s;
        }
        .results-review-sonar-ring-2 {
          animation: results-review-sonar-ring 2s ease-in-out infinite;
          animation-delay: 0.4s;
        }
        .results-review-sonar-ring-3 {
          animation: results-review-sonar-ring 2s ease-in-out infinite;
          animation-delay: 0.8s;
        }
      `}</style>

      <div className="flex min-h-screen flex-col bg-[#0d1117] text-[#e2e8f0]">
        {/* 1. HEADER */}
        <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-[#1e2a3a] px-4">
          <nav className="flex items-center gap-6" aria-label="Workspace tabs">
            <button
              type="button"
              onClick={() => setActiveTab('exam')}
              className={`pb-3 pt-3 text-sm font-medium transition-colors ${
                activeTab === 'exam'
                  ? 'border-b-2 border-[#38bdf8] text-[#38bdf8]'
                  : 'border-b-2 border-transparent text-[#6b7280] hover:text-[#94a3b8]'
              }`}
            >
              Clinical Exam
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('results')}
              className={`pb-3 pt-3 text-sm font-medium transition-colors ${
                activeTab === 'results'
                  ? 'border-b-2 border-[#38bdf8] text-[#38bdf8]'
                  : 'border-b-2 border-transparent text-[#6b7280] hover:text-[#94a3b8]'
              }`}
            >
              Results Review
            </button>
          </nav>

          <div className="justify-self-center px-2">
            <div className="rounded-lg border border-[#1e3a5f] bg-[#1a2535] px-3 py-1.5 text-xs text-[#e2e8f0]">
              <span className="font-medium">Ahmad Kareem · M/34</span>
              <span className="mx-2 text-[#4a5568]">|</span>
              <span className="text-[#94a3b8]">ID: 2024-0872</span>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2d3748] px-3 py-2 text-sm text-[#94a3b8] transition-colors hover:border-[#4a5568] hover:text-[#cbd5e1]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to Queue
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto p-4">
          {/* 2. STATUS BAR */}
          <div className="flex w-full flex-wrap items-center gap-x-0 gap-y-2 rounded-xl border border-[#1e2a3a] bg-[#0f1923] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6b7280]">Case:</span>
              <span className="text-xs font-medium text-[#e2e8f0]">Emergency</span>
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-[#f59e0b]"
                style={{ boxShadow: '0 0 6px #f59e0b' }}
                aria-hidden
              />
            </div>
            <span className="mx-3 hidden h-4 w-px bg-[#1e2a3a] sm:inline" aria-hidden />
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6b7280]">X-Ray:</span>
              <span className="text-xs font-medium text-[#e2e8f0]">Ready</span>
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-[#22c55e]"
                style={{ boxShadow: '0 0 6px #22c55e' }}
                aria-hidden
              />
            </div>
            <span className="mx-3 hidden h-4 w-px bg-[#1e2a3a] sm:inline" aria-hidden />
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6b7280]">Sonar:</span>
              <span className="text-xs font-medium text-[#e2e8f0]">In Progress</span>
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-[#f59e0b]"
                style={{ boxShadow: '0 0 6px #f59e0b' }}
                aria-hidden
              />
            </div>
            <span className="mx-3 hidden h-4 w-px bg-[#1e2a3a] sm:inline" aria-hidden />
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6b7280]">Laboratory:</span>
              <span className="text-xs font-medium text-[#e2e8f0]">Pending</span>
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-[#38bdf8]"
                style={{ boxShadow: '0 0 6px #38bdf8' }}
                aria-hidden
              />
            </div>
            <span className="mx-3 hidden h-4 w-px bg-[#1e2a3a] md:inline" aria-hidden />
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-[#6b7280]">Visit:</span>
              <span className="text-xs font-medium text-[#e2e8f0]">25 Mar 2026 · 10:42</span>
            </div>
          </div>

          {/* 3. IMAGING ROW */}
          <div className="grid min-h-0 grid-cols-1 items-stretch gap-3.5 lg:grid-cols-3">
            {/* CARD A — X-Ray */}
            <article className="flex min-h-0 flex-col rounded-2xl border border-[#1e2a3a] bg-[#0f1923]">
              <div className="shrink-0 border-b border-[#1e2a3a] px-3 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-widest text-[#4a5568]">Imaging</p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none" aria-hidden>
                      🩻
                    </span>
                    <span className="font-medium text-[#38bdf8]">X-Ray</span>
                  </div>
                  <span className="rounded-full border border-[#14532d] bg-[#052e16] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#22c55e]">
                    Ready
                  </span>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
                <div className="relative h-28 overflow-hidden rounded-lg border border-[#1e2a3a] bg-[#050608]">
                  <div
                    className="absolute inset-0 opacity-90"
                    style={{
                      background:
                        'radial-gradient(ellipse 80% 100% at 50% 50%, #1a1f28 0%, #0a0c10 45%, #050608 100%)',
                    }}
                    aria-hidden
                  />
                  <div
                    className="absolute left-1/2 top-1/2 h-20 w-14 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-[#2a3544]/60 bg-[#121820]/80"
                    aria-hidden
                  />
                  <div
                    className="absolute left-[28%] top-[32%] h-10 w-0.5 rotate-12 bg-[#3d4a5c]/50"
                    aria-hidden
                  />
                  <div
                    className="absolute right-[30%] top-[38%] h-8 w-0.5 -rotate-6 bg-[#3d4a5c]/45"
                    aria-hidden
                  />
                  <span className="absolute bottom-1.5 right-2 text-[10px] text-[#4a6080]">Tap to expand</span>
                </div>
                <div
                  className="flex items-start gap-2 rounded-lg border border-[#3d1f0f] bg-[#1a0f0a] p-2"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#f59e0b]" aria-hidden />
                  <p className="text-sm leading-snug text-[#e2a870]">Fracture in the third rib</p>
                </div>
                <button
                  type="button"
                  className="text-center text-[11px] text-[#38bdf8] opacity-70 transition-opacity hover:opacity-100"
                >
                  View full image ↗
                </button>
              </div>
            </article>

            {/* CARD B — Sonar */}
            <article className="flex min-h-0 flex-col rounded-2xl border border-[#1e2a3a] bg-[#0f1923]">
              <div className="shrink-0 border-b border-[#1e2a3a] px-3 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-widest text-[#4a5568]">Ultrasound</p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Waves className="h-4 w-4 text-[#38bdf8]" strokeWidth={2} aria-hidden />
                    <span className="font-medium text-[#38bdf8]">Sonar</span>
                  </div>
                  <span className="rounded-full border border-[#713f12] bg-[#1c1406] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#f59e0b]">
                    In progress
                  </span>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
                <div className="relative flex h-28 items-center justify-center overflow-hidden rounded-lg border border-dashed border-[#1e2a3a] bg-[#080f1a]">
                  <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#1e3a5f] results-review-sonar-ring-1" />
                  <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#1e3a5f] results-review-sonar-ring-2" />
                  <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#1e3a5f] results-review-sonar-ring-3" />
                  <div className="relative z-10 flex flex-col items-center gap-1">
                    <ScanLine className="h-5 w-5 text-[#4a6080]" strokeWidth={1.5} aria-hidden />
                    <span className="text-[11px] text-[#4a6080]">Awaiting scan...</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-xs text-[#4a5568]">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                  <p>No technician notes for this ultrasound study.</p>
                </div>
                <button
                  type="button"
                  className="text-center text-[11px] text-[#38bdf8] opacity-70 transition-opacity hover:opacity-100"
                >
                  View full image ↗
                </button>
              </div>
            </article>

            {/* CARD C — Laboratory */}
            <article className="flex min-h-0 flex-col rounded-2xl border border-[#1e2a3a] bg-[#0f1923]">
              <div className="shrink-0 border-b border-[#1e2a3a] px-3 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-widest text-[#4a5568]">Clinical</p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-[#38bdf8]" strokeWidth={2} aria-hidden />
                    <span className="font-medium text-[#38bdf8]">Laboratory</span>
                  </div>
                  <span className="rounded-full border border-[#1e3a5f] bg-[#0c1a2e] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#38bdf8]">
                    Awaiting
                  </span>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#1e3a5f] bg-[#0c1a2e]">
                  <FlaskConical className="h-6 w-6 text-[#38bdf8]" strokeWidth={1.75} aria-hidden />
                </div>
                <p className="text-sm font-medium text-[#38bdf8]">Awaiting Lab Results</p>
                <p className="max-w-[14rem] text-center text-[11px] text-[#4a5568]">
                  Values appear when the lab posts results
                </p>
                <button
                  type="button"
                  className="rounded-md border border-[#1e3a5f] bg-[#0c1a2e] px-3 py-1.5 text-[11px] text-[#38bdf8] transition-colors hover:border-[#2d4a6a] hover:bg-[#0f2138]"
                >
                  View partial report ↗
                </button>
              </div>
            </article>
          </div>

          {/* 4. BOTTOM ROW */}
          <div className="grid min-h-0 grid-cols-1 gap-3.5 lg:grid-cols-[1.3fr_1fr] lg:items-stretch">
            {/* Final Diagnosis */}
            <article className="flex min-h-0 flex-col rounded-2xl border border-[#1e2a3a] bg-[#0f1923]">
              <div className="shrink-0 border-b border-[#1e2a3a] px-3 py-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-widest text-[#4a5568]">Clinical</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-base leading-none" aria-hidden>
                        📋
                      </span>
                      <span className="text-base font-medium text-[#e2e8f0]">Final Diagnosis</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#6b7280]" aria-hidden />
                    <span className="text-[11px] text-[#6b7280]">Local draft</span>
                  </div>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
                <textarea
                  placeholder="Enter confirmed diagnosis..."
                  className="min-h-[90px] w-full resize-y rounded-lg border border-[#1a2535] bg-[#0a0f15] p-3 text-sm text-[#e2e8f0] placeholder:text-[#4a5568] focus:border-[#2d4a6a] focus:outline-none"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-[#1a2535] bg-[#0a0f15] px-2.5 py-1.5 text-[11px] text-[#4a6080] transition-colors hover:border-[#2d4a6a]"
                  >
                    + ICD-10 Code
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-[#1a2535] bg-[#0a0f15] px-2.5 py-1.5 text-[11px] text-[#4a6080] transition-colors hover:border-[#2d4a6a]"
                  >
                    + Template
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-[#1a2535] bg-[#0a0f15] px-2.5 py-1.5 text-[11px] text-[#4a6080] transition-colors hover:border-[#2d4a6a]"
                  >
                    + Copy from Exam
                  </button>
                </div>
              </div>
            </article>

            {/* Prescription */}
            <article className="flex min-h-0 flex-col rounded-2xl border border-[#1e2a3a] bg-[#0f1923]">
              <div className="shrink-0 border-b border-[#1e2a3a] px-3 py-2.5">
                <p className="text-[10px] font-medium uppercase tracking-widest text-[#4a5568]">Orders</p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none" aria-hidden>
                      💊
                    </span>
                    <span className="font-medium text-[#e2e8f0]">Prescription</span>
                  </div>
                  <span className="rounded-full border border-[#1e3a5f] bg-[#0c1a2e] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#38bdf8]">
                    Pharmacy
                  </span>
                </div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-3 p-3">
                <div className="rounded-lg border border-dashed border-[#1e2a3a] bg-[#080f1a] p-2.5 text-center text-xs text-[#374151]">
                  No medications added yet
                </div>
                <button
                  type="button"
                  className="w-full rounded-xl border border-[#2d5a8a] bg-gradient-to-br from-[#1a3a5c] to-[#0f2744] py-2.5 text-sm font-medium text-[#38bdf8] transition-all hover:border-[#3d6fa0] hover:from-[#1f4568] hover:to-[#123050] hover:shadow-[0_0_16px_rgba(56,189,248,0.12)]"
                >
                  ✍ Write Prescription
                </button>
              </div>
            </article>
          </div>

          {/* 5. SUBMIT BAR */}
          <div className="mt-auto flex shrink-0 flex-wrap justify-end gap-3 border-t border-[#1e2a3a] pt-3">
            <button
              type="button"
              className="rounded-xl border border-[#2d3748] px-5 py-2.5 text-sm text-[#6b7280] transition-colors hover:border-[#4a5568] hover:text-[#94a3b8]"
            >
              Save Draft
            </button>
            <button
              type="button"
              className="rounded-xl bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] px-7 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(14,165,233,0.2)] transition-all hover:-translate-y-px hover:shadow-[0_0_28px_rgba(14,165,233,0.35)]"
            >
              Submit &amp; Archive →
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
