'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

export interface Medicine {
  id: string
  name: string
  scientificName?: string
  commercialName?: string
  currentStock: number
  minimumStock: number // Alert threshold
  expiryDate?: string // ISO date string
  unit: string // e.g., "boxes", "bottles", "strips"
  price: number // Price per unit in IQD
  category?: string
  createdAt: string
  updatedAt: string
}

export interface StockMovement {
  id: string
  medicineId: string
  medicineName: string
  type: 'In' | 'Out' | 'Adjustment'
  quantity: number
  reason: string
  performedBy: string
  performedAt: string
}

interface InventoryContextType {
  medicines: Medicine[]
  stockMovements: StockMovement[]
  addMedicine: (medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>) => Medicine
  updateMedicine: (medicineId: string, updates: Partial<Medicine>) => void
  deductStock: (medicineId: string, quantity: number, reason: string, performedBy: string) => boolean
  getMedicineById: (medicineId: string) => Medicine | undefined
  findMedicineByName: (name: string) => Medicine | undefined
  getLowStockMedicines: () => Medicine[]
  getExpiringMedicines: (months: number) => Medicine[]
  addStockMovement: (movement: Omit<StockMovement, 'id' | 'performedAt'>) => void
  getMedicineMovements: (medicineId: string) => StockMovement[]
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined)

const MINIMUM_STOCK_THRESHOLD = 10 // Default minimum stock

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [medicines, setMedicines] = useState<Medicine[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zionmed_inventory')
      if (saved) {
        return JSON.parse(saved)
      }
    }
    return []
  })

  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('zionmed_stock_movements')
      if (saved) {
        return JSON.parse(saved)
      }
    }
    return []
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zionmed_inventory', JSON.stringify(medicines))
    }
  }, [medicines])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('zionmed_stock_movements', JSON.stringify(stockMovements))
    }
  }, [stockMovements])

  const addMedicine = (medicineData: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>): Medicine => {
    const newMedicine: Medicine = {
      ...medicineData,
      id: `MED-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      minimumStock: medicineData.minimumStock || MINIMUM_STOCK_THRESHOLD,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setMedicines((prev) => [...prev, newMedicine])
    return newMedicine
  }

  const updateMedicine = (medicineId: string, updates: Partial<Medicine>) => {
    setMedicines((prev) =>
      prev.map((med) =>
        med.id === medicineId
          ? { ...med, ...updates, updatedAt: new Date().toISOString() }
          : med
      )
    )
  }

  const deductStock = (medicineId: string, quantity: number, reason: string, performedBy: string): boolean => {
    const medicine = medicines.find((m) => m.id === medicineId)
    if (!medicine) {
      console.error(`Medicine not found: ${medicineId}`)
      return false
    }

    if (medicine.currentStock < quantity) {
      console.warn(`Insufficient stock for ${medicine.name}. Available: ${medicine.currentStock}, Requested: ${quantity}`)
      return false
    }

    const newStock = medicine.currentStock - quantity
    updateMedicine(medicineId, { currentStock: newStock })

    // Record stock movement
    addStockMovement({
      medicineId,
      medicineName: medicine.name,
      type: 'Out',
      quantity,
      reason,
      performedBy,
    })

    return true
  }

  const getMedicineById = (medicineId: string): Medicine | undefined => {
    return medicines.find((m) => m.id === medicineId)
  }

  const findMedicineByName = (name: string): Medicine | undefined => {
    // Fuzzy match by name (case-insensitive, partial match)
    const searchName = name.toLowerCase().trim()
    return medicines.find((m) => m.name.toLowerCase().includes(searchName) || searchName.includes(m.name.toLowerCase()))
  }

  const getLowStockMedicines = (): Medicine[] => {
    return medicines.filter((med) => med.currentStock <= med.minimumStock)
  }

  const getExpiringMedicines = (months: number = 3): Medicine[] => {
    const now = new Date()
    const futureDate = new Date()
    futureDate.setMonth(now.getMonth() + months)

    return medicines.filter((med) => {
      if (!med.expiryDate) return false
      const expiry = new Date(med.expiryDate)
      return expiry <= futureDate && expiry >= now
    })
  }

  const addStockMovement = (movement: Omit<StockMovement, 'id' | 'performedAt'>) => {
    const newMovement: StockMovement = {
      ...movement,
      id: `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      performedAt: new Date().toISOString(),
    }

    setStockMovements((prev) => [...prev, newMovement])
  }

  const getMedicineMovements = (medicineId: string): StockMovement[] => {
    return stockMovements.filter((mov) => mov.medicineId === medicineId)
  }

  return (
    <InventoryContext.Provider
      value={{
        medicines,
        stockMovements,
        addMedicine,
        updateMedicine,
        deductStock,
        getMedicineById,
        findMedicineByName,
        getLowStockMedicines,
        getExpiringMedicines,
        addStockMovement,
        getMedicineMovements,
      }}
    >
      {children}
    </InventoryContext.Provider>
  )
}

export function useInventory() {
  const context = useContext(InventoryContext)
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider')
  }
  return context
}

