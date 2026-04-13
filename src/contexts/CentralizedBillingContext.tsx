'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

export type InvoiceStatus = 'Pending' | 'Partial' | 'Paid' | 'Cancelled'
export type PaymentMethod = 'Cash' | 'Card' | 'Partial'

export interface InvoiceItem {
  id: string
  department: 'Doctor' | 'Laboratory' | 'Radiology' | 'Pharmacy'
  description: string
  quantity: number
  unitPrice: number
  total: number
  addedAt: string
  addedBy: string // User ID
}

export interface PaymentRecord {
  id: string
  amount: number
  method: PaymentMethod
  paidAt: string
  paidBy: string // User ID
}

export interface Invoice {
  id: string
  visitId: string
  patientId: string
  patientName: string
  items: InvoiceItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  status: InvoiceStatus
  payments: PaymentRecord[]
  paidAmount: number
  remainingAmount: number
  createdAt: string
  updatedAt: string
}

interface CentralizedBillingContextType {
  invoices: Record<string, Invoice>
  refreshInvoices: () => Promise<void>
  createInvoice: (patientId: string, patientName: string, visitId: string) => Invoice
  getInvoice: (visitId: string) => Invoice | undefined
  getInvoiceByPatientId: (patientId: string) => Invoice | undefined
  addInvoiceItem: (visitId: string, item: Omit<InvoiceItem, 'id' | 'addedAt'>) => void
  addPayment: (visitId: string, payment: Omit<PaymentRecord, 'id' | 'paidAt'>) => void
  updateInvoiceStatus: (visitId: string, status: InvoiceStatus) => void
  cancelInvoice: (visitId: string) => void
}

const CentralizedBillingContext = createContext<CentralizedBillingContextType | undefined>(undefined)

function mapBillToInvoice(bill: {
  visitId: string
  patientId: string
  patientName: string
  bill: {
    id: string
    items?: unknown[]
    subtotal: number
    tax: number
    discount: number
    total: number
    paymentStatus: string
    paidAt?: string | null
    createdAt: string
    updatedAt: string
  }
}): Invoice {
  const b = bill.bill
  const total = Number(b.total) || 0
  const isPaid = b.paymentStatus === 'Paid' || b.paymentStatus === 'COMPLETED'
  const paidAmount = isPaid ? total : 0
  const remainingAmount = total - paidAmount
  const status: InvoiceStatus = isPaid ? 'Paid' : (b.paymentStatus === 'Partial' ? 'Partial' : 'Pending')
  const items: InvoiceItem[] = Array.isArray(b.items)
    ? (b.items as any[]).map((it: any) => ({
        id: it.id || `item-${it.description || ''}`,
        department: (it.department || 'Doctor') as InvoiceItem['department'],
        description: it.description || '',
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        total: Number(it.total) || 0,
        addedAt: it.addedAt || b.createdAt,
        addedBy: it.addedBy || '',
      }))
    : []
  return {
    id: b.id,
    visitId: bill.visitId,
    patientId: bill.patientId,
    patientName: bill.patientName || 'Unknown',
    items,
    subtotal: Number(b.subtotal) || 0,
    tax: Number(b.tax) || 0,
    discount: Number(b.discount) || 0,
    total,
    status,
    payments: [],
    paidAmount,
    remainingAmount,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  }
}

export function CentralizedBillingProvider({ children }: { children: ReactNode }) {
  const [invoices, setInvoices] = useState<Record<string, Invoice>>({})

  const refreshInvoices = async () => {
    if (typeof window === 'undefined') return
    try {
      const res = await fetch('/api/accountant/all-bills')
      if (!res.ok) return
      const data = await res.json()
      if (!data.success || !Array.isArray(data.bills)) return
      const next: Record<string, Invoice> = {}
      for (const row of data.bills) {
        if (row.visitId && row.bill) {
          next[row.visitId] = mapBillToInvoice(row)
        }
      }
      setInvoices(next)
    } catch {
      // Keep existing state on error
    }
  }

  useEffect(() => {
    refreshInvoices()
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && Object.keys(invoices).length > 0) {
      localStorage.setItem('zionmed_centralized_invoices', JSON.stringify(invoices))
    }
  }, [invoices])

  const createInvoice = (patientId: string, patientName: string, visitId: string): Invoice => {
    const invoice: Invoice = {
      id: `INV-${Date.now()}`,
      visitId,
      patientId,
      patientName,
      items: [],
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      status: 'Pending',
      payments: [],
      paidAmount: 0,
      remainingAmount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setInvoices((prev) => ({
      ...prev,
      [visitId]: invoice,
    }))

    return invoice
  }

  const getInvoice = (visitId: string): Invoice | undefined => {
    return invoices[visitId]
  }

  const getInvoiceByPatientId = (patientId: string): Invoice | undefined => {
    return Object.values(invoices).find((inv) => inv.patientId === patientId && inv.status !== 'Paid' && inv.status !== 'Cancelled')
  }

  const addInvoiceItem = (visitId: string, item: Omit<InvoiceItem, 'id' | 'addedAt'>) => {
    setInvoices((prev) => {
      const invoice = prev[visitId]
      if (!invoice) return prev

      const newItem: InvoiceItem = {
        ...item,
        id: `ITEM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        addedAt: new Date().toISOString(),
      }

      const updatedItems = [...invoice.items, newItem]
      const subtotal = updatedItems.reduce((sum, item) => sum + item.total, 0)
      const total = subtotal + invoice.tax - invoice.discount
      const remainingAmount = total - invoice.paidAmount

      const updatedInvoice: Invoice = {
        ...invoice,
        items: updatedItems,
        subtotal,
        total,
        remainingAmount,
        status: invoice.paidAmount > 0 ? 'Partial' : invoice.paidAmount === total ? 'Paid' : 'Pending',
        updatedAt: new Date().toISOString(),
      }

      return {
        ...prev,
        [visitId]: updatedInvoice,
      }
    })
  }

  const addPayment = (visitId: string, payment: Omit<PaymentRecord, 'id' | 'paidAt'>) => {
    setInvoices((prev) => {
      const invoice = prev[visitId]
      if (!invoice) return prev

      // Validation: Prevent paying more than total
      if (invoice.paidAmount + payment.amount > invoice.total) {
        console.error('Payment amount exceeds total amount')
        return prev
      }

      const newPayment: PaymentRecord = {
        ...payment,
        id: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        paidAt: new Date().toISOString(),
      }

      const updatedPayments = [...invoice.payments, newPayment]
      const paidAmount = updatedPayments.reduce((sum, pay) => sum + pay.amount, 0)
      const remainingAmount = invoice.total - paidAmount

      let status: InvoiceStatus = 'Pending'
      if (paidAmount >= invoice.total) {
        status = 'Paid'
      } else if (paidAmount > 0) {
        status = 'Partial'
      }

      const updatedInvoice: Invoice = {
        ...invoice,
        payments: updatedPayments,
        paidAmount,
        remainingAmount,
        status,
        updatedAt: new Date().toISOString(),
      }

      return {
        ...prev,
        [visitId]: updatedInvoice,
      }
    })
  }

  const updateInvoiceStatus = (visitId: string, status: InvoiceStatus) => {
    setInvoices((prev) => {
      const invoice = prev[visitId]
      if (!invoice) return prev

      return {
        ...prev,
        [visitId]: {
          ...invoice,
          status,
          updatedAt: new Date().toISOString(),
        },
      }
    })
  }

  const cancelInvoice = (visitId: string) => {
    updateInvoiceStatus(visitId, 'Cancelled')
  }

  return (
    <CentralizedBillingContext.Provider
      value={{
        invoices,
        refreshInvoices,
        createInvoice,
        getInvoice,
        getInvoiceByPatientId,
        addInvoiceItem,
        addPayment,
        updateInvoiceStatus,
        cancelInvoice,
      }}
    >
      {children}
    </CentralizedBillingContext.Provider>
  )
}

export function useCentralizedBilling() {
  const context = useContext(CentralizedBillingContext)
  if (context === undefined) {
    throw new Error('useCentralizedBilling must be used within a CentralizedBillingProvider')
  }
  return context
}

