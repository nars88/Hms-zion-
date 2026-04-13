import { PrismaClient, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding test users...')

  // Test users with default credentials
  const testUsers = [
    {
      email: 'admin@zionmed.com',
      password: 'admin123',
      name: 'System Administrator',
      role: UserRole.ADMIN,
      phone: '+964 750 000 0001',
    },
    {
      email: 'reception@zionmed.com',
      password: 'reception123',
      name: 'Reception Staff',
      role: UserRole.RECEPTIONIST,
      phone: '+964 750 000 0002',
    },
    {
      email: 'intake@zionmed.com',
      password: 'intake123',
      name: 'Intake Nurse',
      role: UserRole.INTAKE_NURSE,
      phone: '+964 750 000 0003',
    },
    {
      email: 'doctor@zionmed.com',
      password: 'doctor123',
      name: 'Dr. Sarah Smith',
      role: UserRole.DOCTOR,
      phone: '+964 750 000 0004',
    },
    {
      email: 'doctor@zion.med',
      password: 'doc123',
      name: 'ER Doctor (Test)',
      role: UserRole.DOCTOR,
      phone: '+964 750 000 0011',
    },
    // ^ ER Doctor: login with doctor@zion.med / doc123 → redirects to /emergency/doctor (role is DOCTOR)
    {
      email: 'pharmacy@zion.com',
      password: 'zion123',
      name: 'Senior Pharmacist',
      role: UserRole.PHARMACIST,
      phone: '+964 750 000 0005',
    },
    {
      email: 'pharmacy@zion.med',
      password: 'pharm123',
      name: 'Pharmacy (ZION Med)',
      role: UserRole.PHARMACIST,
      phone: '+964 750 000 0005',
    },
    {
      email: 'accountant@zionmed.com',
      password: 'accountant123',
      name: 'Hospital Accountant',
      role: UserRole.ACCOUNTANT,
      phone: '+964 750 000 0006',
    },
    {
      email: 'ernurse@zionmed.com',
      password: 'ernurse123',
      name: 'ER Nurse',
      role: UserRole.ER_NURSE,
      phone: '+964 750 000 0007',
    },
    {
      email: 'nurse@zion.med',
      password: 'nurse123',
      name: 'ER Nurse (Test)',
      role: UserRole.ER_NURSE,
      phone: '+964 750 000 0010',
    },
    {
      email: 'secretary@zionmed.com',
      password: 'secretary123',
      name: 'Medical Secretary',
      role: UserRole.SECRETARY,
      phone: '+964 750 000 0008',
    },
    {
      email: 'security@zionmed.com',
      password: 'security123',
      name: 'Security Guard',
      role: UserRole.SECURITY,
      phone: '+964 750 000 0009',
    },
    {
      email: 'lab@zion.med',
      password: 'lab123',
      name: 'Lab Technician (Legacy)',
      role: UserRole.LAB_TECH,
      phone: '+964 750 000 0012',
    },
    {
      email: 'lab@zion.com',
      password: 'lab123',
      name: 'Lab Technician',
      role: UserRole.LAB_TECH,
      phone: '+964 750 000 0012',
    },
    {
      email: 'radio@zion.com',
      password: 'radio123',
      name: 'Radiology Technician',
      role: UserRole.RADIOLOGY_TECH,
      phone: '+964 750 000 0013',
    },
  ]

  for (const user of testUsers) {
    try {
      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { email: user.email },
      })

      if (existing) {
        console.log(`⚠️  User ${user.email} already exists, skipping...`)
      } else {
        await prisma.user.create({
          data: user,
        })
        console.log(`✅ Created user: ${user.email} (${user.role})`)
      }
    } catch (error) {
      console.error(`❌ Error creating user ${user.email}:`, error)
    }
  }

  console.log('🌱 Seeding pharmacy inventory (sample drugs)...')
  const sampleDrugs = [
    { drugName: 'Paracetamol 500mg', currentStock: 100, unit: 'box', pricePerUnit: 5000, minThreshold: 10 },
    { drugName: 'Amoxicillin 500mg', currentStock: 50, unit: 'box', pricePerUnit: 12000, minThreshold: 10 },
    { drugName: 'Ibuprofen 400mg', currentStock: 80, unit: 'box', pricePerUnit: 6000, minThreshold: 10 },
  ]
  for (const drug of sampleDrugs) {
    try {
      await prisma.inventory.upsert({
        where: { drugName: drug.drugName },
        create: drug,
        update: {},
      })
    } catch (_) {}
  }
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

