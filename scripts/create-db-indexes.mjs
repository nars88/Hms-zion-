import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits("patientId");')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits("createdAt" DESC);')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_bills_payment_status ON bills("paymentStatus");')
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS idx_bills_visit_id ON bills("visitId");')
  console.log('DB indexes ensured.')
}

main()
  .catch((e) => {
    console.error('Failed to create indexes:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
