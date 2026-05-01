const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

/** Same password as journey test users (password123) for predictable demos. */
const ZION_MED_DEMO_ACCOUNTS = [
  {
    email: 'doctor@zion.med',
    plainPassword: 'password123',
    name: 'ER Doctor (Test)',
    role: 'DOCTOR',
    phone: '+964 750 000 0011',
  },
  {
    email: 'nurse@zion.med',
    plainPassword: 'password123',
    name: 'ER Nurse (Test)',
    role: 'ER_NURSE',
    phone: '+964 750 000 0010',
  },
]

async function main() {
  console.log('🌱 Seeding test users...')

  // Test users with default credentials
  const testUsers = [
    {
      email: 'admin@zionmed.com',
      password: 'admin123',
      name: 'System Administrator',
      role: 'ADMIN',
      phone: '+964 750 000 0001',
    },
    {
      email: 'reception@zionmed.com',
      password: 'reception123',
      name: 'Reception Staff',
      role: 'RECEPTIONIST',
      phone: '+964 750 000 0002',
    },
    {
      email: 'intake@zionmed.com',
      password: 'intake123',
      name: 'Intake Nurse',
      role: 'INTAKE_NURSE',
      phone: '+964 750 000 0003',
    },
    {
      email: 'er-intake@zion.com',
      password: 'password123',
      name: 'ER Intake Nurse (Journey Test)',
      role: 'ER_INTAKE_NURSE',
      phone: '+964 750 000 0014',
    },
    {
      email: 'doctor@zionmed.com',
      password: 'doctor123',
      name: 'Dr. Sarah Smith',
      role: 'DOCTOR',
      phone: '+964 750 000 0004',
    },
    {
      email: 'doctor@zion.med',
      password: 'password123',
      name: 'ER Doctor (Test)',
      role: 'DOCTOR',
      phone: '+964 750 000 0011',
    },
    {
      email: 'pharmacy@zion.com',
      password: 'zion123',
      name: 'Senior Pharmacist',
      role: 'PHARMACIST',
      phone: '+964 750 000 0005',
    },
    {
      email: 'accountant@zionmed.com',
      password: 'accountant123',
      name: 'Hospital Accountant',
      role: 'ACCOUNTANT',
      phone: '+964 750 000 0006',
    },
    {
      email: 'ernurse@zionmed.com',
      password: 'password123',
      name: 'ER Task Nurse (Journey Test)',
      role: 'ER_NURSE',
      phone: '+964 750 000 0007',
    },
    {
      email: 'nurse@zion.med',
      password: 'nurse123',
      name: 'ER Nurse (Test)',
      role: 'ER_NURSE',
      phone: '+964 750 000 0010',
    },
    {
      email: 'secretary@zionmed.com',
      password: 'secretary123',
      name: 'Medical Secretary',
      role: 'SECRETARY',
      phone: '+964 750 000 0008',
    },
    {
      email: 'security@zionmed.com',
      password: 'security123',
      name: 'Security Guard',
      role: 'SECURITY',
      phone: '+964 750 000 0009',
    },
    {
      email: 'lab@zion.med',
      password: 'lab123',
      name: 'Lab Technician (Legacy)',
      role: 'LAB_TECH',
      phone: '+964 750 000 0012',
    },
    {
      email: 'lab@zion.com',
      password: 'lab123',
      name: 'Lab Technician',
      role: 'LAB_TECH',
      phone: '+964 750 000 0012',
    },
    {
      email: 'radio@zion.com',
      password: 'radio123',
      name: 'Radiology Technician',
      role: 'RADIOLOGY_TECH',
      phone: '+964 750 000 0013',
    },
    {
      email: 'er-reception@zionmed.com',
      password: 'password123',
      name: 'ER Quick Reception (Journey Test)',
      role: 'RECEPTIONIST',
      phone: '+964 750 000 0015',
    },
  ]

  for (const user of testUsers) {
    try {
      const hashedPassword = await bcrypt.hash(user.password, 12)
      await prisma.user.upsert({
        where: { email: user.email },
        create: {
          email: user.email,
          password: hashedPassword,
          name: user.name,
          role: user.role,
          phone: user.phone,
        },
        update: {
          password: hashedPassword,
          name: user.name,
          role: user.role,
          phone: user.phone,
        },
      })
      console.log(`✅ Account reset: ${user.email} (${user.role})`)
    } catch (error) {
      console.error(`❌ Error resetting user ${user.email}:`, error)
    }
  }

  for (const acc of ZION_MED_DEMO_ACCOUNTS) {
    try {
      const password = await bcrypt.hash(acc.plainPassword, 12)
      await prisma.user.upsert({
        where: { email: acc.email },
        create: {
          email: acc.email,
          password,
          name: acc.name,
          role: acc.role,
          phone: acc.phone,
        },
        update: {
          password,
          name: acc.name,
          role: acc.role,
          phone: acc.phone,
        },
      })
      console.log(`✅ Demo account ready: ${acc.email}`)
    } catch (error) {
      console.error(`❌ Error upserting ${acc.email}:`, error)
    }
  }

  await prisma.systemSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default', systemName: 'NARS Hospital', logoUrl: null },
    update: {},
  })

  console.log('✨ Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

