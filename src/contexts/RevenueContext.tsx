'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface RevenueContextType {
  hospitalRevenue: number
  addRevenue: (amount: number) => void
  getRevenue: () => number
}

const RevenueContext = createContext<RevenueContextType | undefined>(undefined)

export function RevenueProvider({ children }: { children: ReactNode }) {
  const [hospitalRevenue, setHospitalRevenue] = useState<number>(() => {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zionmed_hospital_revenue')
      if (saved) {
        return parseFloat(saved) || 0
      }
    }
    return 0
  })

  const addRevenue = (amount: number) => {
    setHospitalRevenue((prev) => {
      const newTotal = prev + amount
      if (typeof window !== 'undefined') {
        localStorage.setItem('zionmed_hospital_revenue', newTotal.toString())
      }
      return newTotal
    })
  }

  const getRevenue = () => hospitalRevenue

  return (
    <RevenueContext.Provider value={{ hospitalRevenue, addRevenue, getRevenue }}>
      {children}
    </RevenueContext.Provider>
  )
}

export function useRevenue() {
  const context = useContext(RevenueContext)
  if (context === undefined) {
    throw new Error('useRevenue must be used within a RevenueProvider')
  }
  return context
}

