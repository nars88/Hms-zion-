import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/**
 * Single temporary password for **all** seeded demo/UAT accounts.
 * Replace in production after first login; never ship this value in public builds.
 */
export const NARS_SEED_TEMP_PASSWORD = 'Zion@2026'

type SeedUser = {
  email: string
  name: string
  role: UserRole
  phone: string
  /** Human-readable area for handover tables (not stored on User). */
  department: string
}

/**
 * One row per seeded account. Covers every `UserRole` in `schema.prisma`
 * across Administration, Accounts, Emergency, Clinical, Pharmacy, Diagnostics, Security.
 */
const SEED_USERS: SeedUser[] = [
  // Administration / IT
  {
    email: 'admin@zionmed.com',
    name: 'System Administrator',
    role: UserRole.ADMIN,
    phone: '+964 750 000 0001',
    department: 'Administration / IT',
  },
  {
    email: 'admin@zion.med',
    name: 'System Administrator (Alt)',
    role: UserRole.ADMIN,
    phone: '+964 750 000 0016',
    department: 'Administration / IT',
  },
  // Accounts / Finance
  {
    email: 'accountant@zionmed.com',
    name: 'Hospital Accountant',
    role: UserRole.ACCOUNTANT,
    phone: '+964 750 000 0006',
    department: 'Accounts / Finance',
  },
  // Reception (RECEPTIONIST + legacy RECEPTION tag for API tests)
  {
    email: 'reception@zionmed.com',
    name: 'Reception Staff',
    role: UserRole.RECEPTIONIST,
    phone: '+964 750 000 0002',
    department: 'Reception / Front desk',
  },
  {
    email: 'er-reception@zionmed.com',
    name: 'ER Quick Reception',
    role: UserRole.RECEPTIONIST,
    phone: '+964 750 000 0015',
    department: 'Emergency / Reception',
  },
  {
    email: 'reception.legacy@zionmed.com',
    name: 'Lead Reception (Legacy RECEPTION role)',
    role: UserRole.RECEPTION,
    phone: '+964 750 000 0017',
    department: 'Reception (Legacy role tag)',
  },
  // Clinical intake
  {
    email: 'intake@zionmed.com',
    name: 'Intake Nurse',
    role: UserRole.INTAKE_NURSE,
    phone: '+964 750 000 0003',
    department: 'Clinical / Intake',
  },
  // Emergency — vitals terminal
  {
    email: 'er-intake@zion.com',
    name: 'ER Vitals Station',
    role: UserRole.ER_INTAKE_NURSE,
    phone: '+964 750 000 0014',
    department: 'Emergency / Vitals station',
  },
  // Emergency — nursing
  {
    email: 'ernurse@zionmed.com',
    name: 'ER Nurse',
    role: UserRole.ER_NURSE,
    phone: '+964 750 000 0007',
    department: 'Emergency / Nursing',
  },
  {
    email: 'nurse@zion.med',
    name: 'ER Nurse (Test)',
    role: UserRole.ER_NURSE,
    phone: '+964 750 000 0010',
    department: 'Emergency / Nursing',
  },
  // Clinical — physicians
  {
    email: 'doctor@zionmed.com',
    name: 'Dr. Sarah Smith',
    role: UserRole.DOCTOR,
    phone: '+964 750 000 0004',
    department: 'Clinical / Outpatient',
  },
  {
    email: 'doctor@zion.med',
    name: 'ER Doctor (Test)',
    role: UserRole.DOCTOR,
    phone: '+964 750 000 0011',
    department: 'Emergency / Physician',
  },
  // Clinical support
  {
    email: 'secretary@zionmed.com',
    name: 'Medical Secretary',
    role: UserRole.SECRETARY,
    phone: '+964 750 000 0008',
    department: 'Clinical / Secretary & clinic queue',
  },
  // Pharmacy
  {
    email: 'pharmacy@zion.com',
    name: 'Senior Pharmacist',
    role: UserRole.PHARMACIST,
    phone: '+964 750 000 0005',
    department: 'Pharmacy',
  },
  {
    email: 'pharmacy@zion.med',
    name: 'Pharmacist (Alt)',
    role: UserRole.PHARMACIST,
    phone: '+964 750 000 0018',
    department: 'Pharmacy',
  },
  // Diagnostics — laboratory
  {
    email: 'lab@zion.med',
    name: 'Lab Technician (Legacy)',
    role: UserRole.LAB_TECH,
    phone: '+964 750 000 0012',
    department: 'Diagnostics / Laboratory',
  },
  {
    email: 'lab@zion.com',
    name: 'Lab Technician',
    role: UserRole.LAB_TECH,
    phone: '+964 750 000 0019',
    department: 'Diagnostics / Laboratory',
  },
  // Diagnostics — radiology
  {
    email: 'radio@zion.com',
    name: 'Radiology Technician',
    role: UserRole.RADIOLOGY_TECH,
    phone: '+964 750 000 0013',
    department: 'Diagnostics / Radiology',
  },
  // Security
  {
    email: 'security@zionmed.com',
    name: 'Security Guard',
    role: UserRole.SECURITY,
    phone: '+964 750 000 0009',
    department: 'Security / Gatekeeper',
  },
]

async function main() {
  console.log('🌱 Seeding NARS Hospital demo users (single password policy)...')
  const passwordHash = await bcrypt.hash(NARS_SEED_TEMP_PASSWORD, 12)

  for (const u of SEED_USERS) {
    try {
      await prisma.user.upsert({
        where: { email: u.email },
        create: {
          email: u.email,
          password: passwordHash,
          name: u.name,
          role: u.role,
          phone: u.phone,
        },
        update: {
          password: passwordHash,
          name: u.name,
          role: u.role,
          phone: u.phone,
        },
      })
      console.log(`✅ ${u.department} — ${u.email} (${u.role})`)
    } catch (error) {
      console.error(`❌ ${u.email}:`, error)
    }
  }

  await prisma.systemSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default', systemName: 'NARS Hospital', logoUrl: null },
    update: {},
  })

  console.log(`✨ Seeding completed. Temporary password for all accounts: ${NARS_SEED_TEMP_PASSWORD}`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
