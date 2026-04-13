import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Running departments migration...')

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      color TEXT,
      head_employee_id TEXT,
      hod_name TEXT,
      hod_tag TEXT,
      employee_ids JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  console.log('✓ Table created')

  await prisma.$executeRawUnsafe(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id TEXT
  `)
  console.log('✓ Column added to users')

  const departments = [
    { name: 'Emergency',   description: 'Critical and urgent patient care.',                  color: '#ef4444' },
    { name: 'Reception',   description: 'Registration, booking, and front-desk workflow.',    color: '#0ea5e9' },
    { name: 'Pharmacy',    description: 'Medication dispensing and prescription handling.',   color: '#10b981' },
    { name: 'Laboratory',  description: 'Lab requests and diagnostic result processing.',     color: '#8b5cf6' },
    { name: 'Radiology',   description: 'Imaging workflows including X-ray and scans.',      color: '#6366f1' },
    { name: 'Intake',      description: 'Initial assessment and triage intake process.',      color: '#f59e0b' },
    { name: 'Security',    description: 'Access control and gatekeeping operations.',         color: '#f97316' },
    { name: 'Accounting',  description: 'Billing, payments, and financial operations.',      color: '#14b8a6' },
  ]

  for (const dept of departments) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO departments (id, name, description, color)
      VALUES (gen_random_uuid()::text, $1, $2, $3)
      ON CONFLICT (name) DO NOTHING
    `, dept.name, dept.description, dept.color)
    console.log(`✓ Inserted: ${dept.name}`)
  }

  console.log('Migration complete.')
}

main()
  .catch((e) => { console.error('Migration failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
