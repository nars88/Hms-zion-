export interface InvoiceItem {
  department: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Invoice {
  id: string
  visitId: string
  patient: {
    id: string
    firstName: string
    lastName: string
    phone: string
  }
  items: InvoiceItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentStatus: string
  paymentMethod: string | null
  qrCode: string | null
  qrStatus: string
  paidAt: string | null
  createdAt: string
  updatedAt: string
}

