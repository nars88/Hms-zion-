/**
 * One-off script: adds "Test Scroll Patient" to the Accountant Queue
 * with 15 service items so you can test the invoice modal scroll.
 *
 * Run: node scripts/add-test-scroll-patient.js
 * (from project root; ensure prisma generate has been run)
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const TEST_ITEMS = [
  { department: 'Doctor', description: 'Consultation', quantity: 1, unitPrice: 25000, total: 25000 },
  { department: 'Lab', description: 'Full Blood Count', quantity: 1, unitPrice: 15000, total: 15000 },
  { department: 'Radiology', description: 'X-Ray Chest', quantity: 1, unitPrice: 20000, total: 20000 },
  { department: 'Radiology', description: 'Ultrasound Abdomen', quantity: 1, unitPrice: 35000, total: 35000 },
  { department: 'Pharmacy', description: 'Pharmacy Meds 1', quantity: 2, unitPrice: 5000, total: 10000 },
  { department: 'Pharmacy', description: 'Pharmacy Meds 2', quantity: 1, unitPrice: 8000, total: 8000 },
  { department: 'Lab', description: 'Urine Analysis', quantity: 1, unitPrice: 7000, total: 7000 },
  { department: 'Lab', description: 'Blood Sugar Fasting', quantity: 1, unitPrice: 5000, total: 5000 },
  { department: 'Radiology', description: 'ECG', quantity: 1, unitPrice: 12000, total: 12000 },
  { department: 'Doctor', description: 'Follow-up Visit', quantity: 1, unitPrice: 15000, total: 15000 },
  { department: 'Pharmacy', description: 'Pharmacy Meds 3', quantity: 1, unitPrice: 12000, total: 12000 },
  { department: 'Lab', description: 'Liver Function Test', quantity: 1, unitPrice: 18000, total: 18000 },
  { department: 'Radiology', description: 'CT Scan', quantity: 1, unitPrice: 80000, total: 80000 },
  { department: 'Pharmacy', description: 'Pharmacy Meds 4', quantity: 2, unitPrice: 4500, total: 9000 },
  { department: 'Other', description: 'Misc Service', quantity: 1, unitPrice: 5000, total: 5000 },
]

async function main() {
  const subtotal = TEST_ITEMS.reduce((s, i) => s + i.total, 0)
  const tax = Math.round(subtotal * 0.05)
  const total = subtotal + tax

  const user = await prisma.user.findFirst({ select: { id: true } })
  if (!user) {
    console.error('No user in database. Run db:seed first.')
    process.exit(1)
  }

  const existing = await prisma.patient.findFirst({
    where: {
      firstName: 'Test',
      lastName: 'Scroll Patient',
    },
    include: { visits: { include: { bill: true } } },
  })

  if (existing?.visits?.[0]?.bill) {
    console.log('"Test Scroll Patient" already exists in the queue. Visit ID:', existing.visits[0].id)
    console.log('Open the Accountant dashboard and select them to test scroll.')
    return
  }

  const patient = await prisma.patient.create({
    data: {
      firstName: 'Test',
      lastName: 'Scroll Patient',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'Other',
      phone: '+9647000000000',
    },
  })

  const visit = await prisma.visit.create({
    data: {
      patientId: patient.id,
      status: 'Billing',
      chiefComplaint: 'Test scroll',
      notes: 'Test data for invoice modal scroll.',
    },
  })

  await prisma.bill.create({
    data: {
      visitId: visit.id,
      patientId: patient.id,
      generatedBy: user.id,
      items: TEST_ITEMS,
      subtotal,
      tax,
      discount: 0,
      total,
      paymentStatus: 'Pending',
      qrStatus: 'LOCKED',
    },
  })

  console.log('Done. "Test Scroll Patient" added to the Accountant Queue.')
  console.log('Visit ID:', visit.id)
  console.log('Items:', TEST_ITEMS.length)
  console.log('Open the Accountant dashboard, find them in the list, and open the invoice to test scroll.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
