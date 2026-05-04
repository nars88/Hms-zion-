import type { Invoice } from '@/types/billing'

export const ACCOUNTANT_BILLS_QUERY_KEY = ['accountant', 'all-bills'] as const

export async function fetchAccountantBills(): Promise<Invoice[]> {
  const res = await fetch('/api/accountant/all-bills')
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || 'Failed to load pending bills')
  }
  const data = (await res.json()) as { bills?: unknown[] }
  const bills = Array.isArray(data.bills) ? data.bills : []
  return bills.map((bill: any) => {
    const nameParts = bill.patientName?.split(' ') || ['Unknown', 'Patient']
    const firstName = nameParts[0] || 'Unknown'
    const lastName = nameParts.slice(1).join(' ') || 'Patient'

    const subtotal = Number(bill.bill.subtotal) || 0
    const tax = Number(bill.bill.tax) || 0
    const discount = Number(bill.bill.discount) || 0
    const rawTotal = Number(bill.bill.total)
    const computedTotal = subtotal + tax - discount
    const safeTotal = Number.isFinite(rawTotal) && rawTotal > 0 ? rawTotal : computedTotal

    return {
      id: bill.bill.id,
      visitId: bill.visitId,
      patient: {
        id: bill.patientId,
        firstName,
        lastName,
        phone: bill.patientPhone || '',
      },
      items: bill.bill.items,
      subtotal,
      tax,
      discount,
      total: safeTotal,
      paymentStatus: bill.bill.paymentStatus,
      paymentMethod: bill.bill.paymentMethod,
      qrCode: bill.bill.qrCode,
      qrStatus: bill.bill.qrStatus,
      paidAt: bill.bill.paidAt,
      createdAt: bill.bill.createdAt,
      updatedAt: bill.bill.updatedAt,
      hasUndispensedMedications: Boolean(bill.hasUndispensedMedications),
      undispensedMedicationStatus: bill.undispensedMedicationStatus || null,
    } as Invoice
  })
}
