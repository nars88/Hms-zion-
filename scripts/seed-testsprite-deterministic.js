/**
 * Deterministic fixtures for TestSprite runs.
 *
 * Creates/updates:
 * - Test Patient A + Waiting visit (for intake queue)
 * - Test Billing Patient + Billing visit + Pending bill (for accountant queue)
 *
 * Run:
 *   node scripts/seed-testsprite-deterministic.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const BILL_ITEMS = [
  { department: 'Doctor', description: 'General Consultation', quantity: 1, unitPrice: 25000, total: 25000 },
  { department: 'Lab', description: 'CBC', quantity: 1, unitPrice: 15000, total: 15000 },
  { department: 'Radiology', description: 'X-Ray Chest', quantity: 1, unitPrice: 20000, total: 20000 },
]

function billTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0)
  const tax = Math.round(subtotal * 0.05)
  const discount = 0
  const total = subtotal + tax - discount
  return { subtotal, tax, discount, total }
}

async function ensurePatientAndWaitingVisit() {
  const patientPhone = '07900000001'
  const existing = await prisma.patient.findFirst({ where: { phone: patientPhone }, select: { id: true } })
  const patient = existing
    ? await prisma.patient.update({
        where: { id: existing.id },
        data: {
          firstName: 'Test',
          lastName: 'Patient A',
          dateOfBirth: new Date('1992-03-23'),
          gender: 'Male',
          allergies: 'None',
          triageLevel: 3,
        },
      })
    : await prisma.patient.create({
        data: {
          firstName: 'Test',
          lastName: 'Patient A',
          dateOfBirth: new Date('1992-03-23'),
          gender: 'Male',
          phone: patientPhone,
          email: 'test.patient.a@zion.local',
          address: 'Baghdad',
          emergencyContact: 'Test Contact',
          emergencyPhone: '07900000011',
          bloodGroup: 'O+',
          allergies: 'None',
          triageLevel: 3,
          medicalHistory: 'Deterministic test fixture',
        },
      })

  let waitingVisit = await prisma.visit.findFirst({
    where: {
      patientId: patient.id,
      status: 'Waiting',
      vitals: { none: {} },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (!waitingVisit) {
    waitingVisit = await prisma.visit.create({
      data: {
        patientId: patient.id,
        status: 'Waiting',
        chiefComplaint: 'Automated intake fixture',
        notes: 'Deterministic waiting visit for TestSprite intake flow',
      },
    })
  }

  return { patient, waitingVisit }
}

async function ensureBillingFixture() {
  const patientPhone = '07900000002'
  const existing = await prisma.patient.findFirst({ where: { phone: patientPhone }, select: { id: true } })
  const patient = existing
    ? await prisma.patient.update({
        where: { id: existing.id },
        data: {
          firstName: 'Test',
          lastName: 'Billing Patient',
          dateOfBirth: new Date('1990-01-01'),
          gender: 'Female',
          allergies: 'None',
          triageLevel: 4,
        },
      })
    : await prisma.patient.create({
        data: {
          firstName: 'Test',
          lastName: 'Billing Patient',
          dateOfBirth: new Date('1990-01-01'),
          gender: 'Female',
          phone: patientPhone,
          email: 'test.billing@zion.local',
          address: 'Baghdad',
          emergencyContact: 'Billing Contact',
          emergencyPhone: '07900000012',
          bloodGroup: 'A+',
          allergies: 'None',
          triageLevel: 4,
          medicalHistory: 'Deterministic billing fixture',
        },
      })

  let billingVisit = await prisma.visit.findFirst({
    where: {
      patientId: patient.id,
      status: 'Billing',
      bill: { isNot: null },
    },
    include: { bill: true },
    orderBy: { createdAt: 'desc' },
  })

  if (!billingVisit) {
    billingVisit = await prisma.visit.create({
      data: {
        patientId: patient.id,
        status: 'Billing',
        chiefComplaint: 'Automated billing fixture',
        notes: 'Deterministic billing visit for TestSprite accountant flow',
      },
    })
  }

  const generator =
    (await prisma.user.findFirst({ where: { role: 'ACCOUNTANT' }, select: { id: true } })) ||
    (await prisma.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } })) ||
    (await prisma.user.findFirst({ select: { id: true } }))

  if (!generator) {
    throw new Error('No users found in database. Cannot create deterministic bill fixture.')
  }

  const totals = billTotals(BILL_ITEMS)
  if (!billingVisit.bill) {
    await prisma.bill.create({
      data: {
        visitId: billingVisit.id,
        patientId: patient.id,
        generatedBy: generator.id,
        items: BILL_ITEMS,
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.discount,
        total: totals.total,
        paymentStatus: 'Pending',
        paymentMethod: null,
        qrCode: `TEST-BILL-${billingVisit.id}`,
        qrStatus: 'LOCKED',
      },
    })
  } else {
    await prisma.bill.update({
      where: { visitId: billingVisit.id },
      data: {
        items: BILL_ITEMS,
        subtotal: totals.subtotal,
        tax: totals.tax,
        discount: totals.discount,
        total: totals.total,
        paymentStatus: 'Pending',
        paymentMethod: null,
        qrStatus: 'LOCKED',
      },
    })
  }

  return { patient, billingVisit }
}

async function main() {
  const intake = await ensurePatientAndWaitingVisit()
  const billing = await ensureBillingFixture()

  console.log('Deterministic fixtures ready:')
  console.log(`- Intake patient: ${intake.patient.firstName} ${intake.patient.lastName} (${intake.patient.phone})`)
  console.log(`  Waiting visit ID: ${intake.waitingVisit.id}`)
  console.log(`- Billing patient: ${billing.patient.firstName} ${billing.patient.lastName} (${billing.patient.phone})`)
  console.log(`  Billing visit ID: ${billing.billingVisit.id}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

