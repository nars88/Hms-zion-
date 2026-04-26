import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addIndexes() {
  console.log('Adding performance indexes...')

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_visits_status
    ON visits(status)
  `).catch(() => {})

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_visits_patient_id
    ON visits(patient_id)
  `).catch(() => {})

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_visits_created_at
    ON visits(created_at DESC)
  `).catch(() => {})

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_bills_payment_status
    ON bills(payment_status)
  `).catch(() => {})

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_bills_visit_id
    ON bills(visit_id)
  `).catch(() => {})

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_patients_name
    ON patients(first_name, last_name)
  `).catch(() => {})

  console.log('All indexes add attempt finished')
  await prisma.$disconnect()
}

addIndexes().catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
