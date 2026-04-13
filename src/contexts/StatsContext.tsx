'use client'

import { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react'

interface ProcedureClick {
  procedureId: string
  procedureName: string
  timestamp: string
}

interface StatsContextType {
  procedureClicks: ProcedureClick[]
  recordProcedureClick: (procedureId: string, procedureName: string) => void
  getTopProcedure: () => { name: string; count: number } | null
  topProcedure: { name: string; count: number } | null
}

const StatsContext = createContext<StatsContextType | undefined>(undefined)

export function StatsProvider({ children }: { children: ReactNode }) {
  const [procedureClicks, setProcedureClicks] = useState<ProcedureClick[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zionmed_procedure_clicks')
      if (saved) {
        return JSON.parse(saved)
      }
    }
    return []
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zionmed_procedure_clicks', JSON.stringify(procedureClicks))
    }
  }, [procedureClicks])

  const recordProcedureClick = (procedureId: string, procedureName: string) => {
    setProcedureClicks((prev) => [
      ...prev,
      {
        procedureId,
        procedureName,
        timestamp: new Date().toISOString(),
      },
    ])
  }

  const getTopProcedure = (): { name: string; count: number } | null => {
    if (procedureClicks.length === 0) return null

    // Count clicks per procedure
    const counts: Record<string, number> = {}
    procedureClicks.forEach((click) => {
      counts[click.procedureName] = (counts[click.procedureName] || 0) + 1
    })

    // Find the most clicked procedure
    let topProcedure: { name: string; count: number } | null = null
    Object.entries(counts).forEach(([name, count]) => {
      if (!topProcedure || count > topProcedure.count) {
        topProcedure = { name, count }
      }
    })

    return topProcedure
  }

  // Calculate top procedure reactively (only today's clicks)
  const topProcedure = useMemo(() => {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const todayClicks = procedureClicks.filter((click) => {
      const clickDate = new Date(click.timestamp).toISOString().split('T')[0]
      return clickDate === today
    })

    if (todayClicks.length === 0) return null

    // Count clicks per procedure
    const counts: Record<string, number> = {}
    todayClicks.forEach((click) => {
      counts[click.procedureName] = (counts[click.procedureName] || 0) + 1
    })

    // Find the most clicked procedure
    let top: { name: string; count: number } | null = null
    Object.entries(counts).forEach(([name, count]) => {
      if (!top || count > top.count) {
        top = { name, count }
      }
    })

    return top
  }, [procedureClicks])

  return (
    <StatsContext.Provider value={{ procedureClicks, recordProcedureClick, getTopProcedure, topProcedure }}>
      {children}
    </StatsContext.Provider>
  )
}

export function useStats() {
  const context = useContext(StatsContext)
  if (context === undefined) {
    throw new Error('useStats must be used within a StatsProvider')
  }
  return context
}

