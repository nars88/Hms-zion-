import { prisma } from '@/lib/prisma'

export const ER_ADMISSION_SERVICE_CODE = 'ER_ADMISSION_FEE'
export const DEFAULT_ER_ADMISSION_FEE = 10_000

type BillItem = {
  id?: string
  department?: string
  description?: string
  quantity?: number
  unitPrice?: number
  total?: number
  addedAt?: string
  addedBy?: string
  sourceTaskId?: string | null
  serviceCode?: string | null
  billingUnit?: string
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function resolveErAdmissionFee() {
  const service = await prisma.serviceCatalog.findFirst({
    where: {
      serviceCode: ER_ADMISSION_SERVICE_CODE,
      isActive: true,
    },
    select: { basePrice: true },
  })
  const resolved = service ? toNumber(service.basePrice) : DEFAULT_ER_ADMISSION_FEE
  return resolved > 0 ? resolved : DEFAULT_ER_ADMISSION_FEE
}

export async function ensureErAdmissionBill(params: {
  visitId: string
  patientId: string
  generatedBy: string
}) {
  const fee = await resolveErAdmissionFee()
  const nowIso = new Date().toISOString()
  const admissionItem: BillItem = {
    id: `ER-ADM-${params.visitId}`,
    department: 'ER',
    description: 'ER Admission Fee',
    quantity: 1,
    unitPrice: fee,
    total: fee,
    addedAt: nowIso,
    addedBy: params.generatedBy,
    sourceTaskId: null,
    serviceCode: ER_ADMISSION_SERVICE_CODE,
    billingUnit: 'PER_TASK',
  }

  const existingBill = await prisma.bill.findUnique({
    where: { visitId: params.visitId },
  })

  if (!existingBill) {
    return prisma.bill.create({
      data: {
        visitId: params.visitId,
        patientId: params.patientId,
        generatedBy: params.generatedBy,
        items: [admissionItem],
        subtotal: fee,
        tax: 0,
        discount: 0,
        total: fee,
        paymentStatus: 'Pending',
        qrStatus: 'LOCKED',
      },
    })
  }

  const existingItems = (existingBill.items as BillItem[]) || []
  const alreadyAdded = existingItems.some((item) => item?.serviceCode === ER_ADMISSION_SERVICE_CODE)
  if (alreadyAdded) return existingBill

  const mergedItems = [...existingItems, admissionItem]
  const subtotal = mergedItems.reduce((sum, item) => sum + toNumber(item?.total), 0)
  const tax = toNumber(existingBill.tax)
  const discount = toNumber(existingBill.discount)
  const total = subtotal + tax - discount

  return prisma.bill.update({
    where: { id: existingBill.id },
    data: {
      items: mergedItems,
      subtotal,
      total,
      paymentStatus: 'Pending',
      qrStatus: existingBill.qrStatus || 'LOCKED',
      updatedAt: new Date(),
    },
  })
}
