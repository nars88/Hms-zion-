'use client'

import { useEffect, useMemo, useState } from 'react'

type ApiLabRequest = {
  at: string
  testType: string
  status: 'PENDING' | 'IN_PROGRESS' | 'SAMPLE_COLLECTED' | 'COMPLETED'
  result?: string
  completedAt?: string
  releasedToDoctorAt?: string
}

type BedRow = {
  visitId: string | null
  patientId: string | null
  patientName: string | null
  labRequests: ApiLabRequest[]
}

type CompletedResultRow = {
  id: string
  visitId: string
  at: string
  patientName: string
  testType: string
  result: string
  releasedToDoctorAt?: string
}

export default function AdminLabResultsPage() {
  const [rows, setRows] = useState<CompletedResultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingKey, setSendingKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const fetchRows = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await fetch('/api/lab/er-beds?department=Lab', { cache: 'no-store' })
      const data = res.ok ? await res.json() : []
      const beds = Array.isArray(data) ? (data as BedRow[]) : []
      const next = beds.flatMap((bed) =>
        (bed.labRequests || [])
          .filter((r) => r.status === 'COMPLETED')
          .map((r) => ({
            id: `${bed.visitId || 'unknown'}-${r.at}`,
            visitId: bed.visitId || '',
            at: r.at,
            patientName: bed.patientName || 'Unknown',
            testType: r.testType || 'Lab Test',
            result: r.result || '—',
            releasedToDoctorAt: r.releasedToDoctorAt,
          }))
      )
      setRows(next)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void fetchRows(false)
    const t = window.setInterval(() => void fetchRows(true), 15000)
    return () => window.clearInterval(t)
  }, [])

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => (a.at > b.at ? -1 : 1)),
    [rows]
  )

  const sendToDoctor = async (row: CompletedResultRow) => {
    const key = `${row.visitId}-${row.at}`
    if (sendingKey === key || row.releasedToDoctorAt) return
    try {
      setSendingKey(key)
      const res = await fetch('/api/lab/er-beds/release-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitId: row.visitId, at: row.at }),
      })
      if (!res.ok) throw new Error('Failed to release result')
      setToast('Sent to doctor successfully')
      window.setTimeout(() => setToast(null), 2200)
      await fetchRows(true)
    } finally {
      setSendingKey(null)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <main className="flex-1 overflow-auto p-6">
        <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">Completed Lab Results</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-700/70 text-left text-slate-400">
                  <th className="px-2 py-2 font-medium">Patient</th>
                  <th className="px-2 py-2 font-medium">Test</th>
                  <th className="px-2 py-2 font-medium">Result</th>
                  <th className="px-2 py-2 font-medium">Completed</th>
                  <th className="px-2 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Loading results...
                    </td>
                  </tr>
                ) : sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No completed lab results found.
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((row) => {
                    const key = `${row.visitId}-${row.at}`
                    return (
                      <tr key={row.id} className="border-b border-slate-800/70">
                        <td className="px-2 py-2 text-slate-100">{row.patientName}</td>
                        <td className="px-2 py-2 text-slate-300">{row.testType}</td>
                        <td className="max-w-[280px] truncate px-2 py-2 text-slate-400">{row.result}</td>
                        <td className="px-2 py-2 text-slate-400">
                          {new Date(row.at).toLocaleString()}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button
                            type="button"
                            disabled={Boolean(row.releasedToDoctorAt) || sendingKey === key}
                            onClick={() => void sendToDoctor(row)}
                            className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
                              row.releasedToDoctorAt
                                ? 'cursor-not-allowed border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                                : 'border-violet-500/40 bg-violet-500/20 text-violet-200 hover:bg-violet-500/30'
                            }`}
                          >
                            {row.releasedToDoctorAt ? 'Sent' : sendingKey === key ? 'Sending...' : 'Send to Doctor'}
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        {toast ? (
          <div className="fixed right-4 top-4 z-[70] rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-xs text-emerald-200 shadow-lg">
            {toast}
          </div>
        ) : null}
      </main>
    </div>
  )
}
