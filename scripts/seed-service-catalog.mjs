import { PrismaClient, BillingUnit, EmergencyTaskCategory, ServiceDepartment } from '@prisma/client'

const prisma = new PrismaClient()

const SERVICES = [
  {
    serviceCode: 'NURSING_IV_DRIP',
    displayName: 'IV Drip Administration',
    department: ServiceDepartment.NURSING,
    taskCategory: EmergencyTaskCategory.NURSING,
    billingUnit: BillingUnit.PER_TASK,
    basePrice: 15000,
  },
  {
    serviceCode: 'NURSING_DRESSING',
    displayName: 'Wound Dressing',
    department: ServiceDepartment.NURSING,
    taskCategory: EmergencyTaskCategory.NURSING,
    billingUnit: BillingUnit.PER_TASK,
    basePrice: 12000,
  },
  {
    serviceCode: 'LAB_CBC',
    displayName: 'Complete Blood Count (CBC)',
    department: ServiceDepartment.LAB,
    taskCategory: EmergencyTaskCategory.DIAGNOSTIC_LAB,
    billingUnit: BillingUnit.PER_TASK,
    basePrice: 18000,
  },
  {
    serviceCode: 'LAB_GLUCOSE',
    displayName: 'Blood Glucose Test',
    department: ServiceDepartment.LAB,
    taskCategory: EmergencyTaskCategory.DIAGNOSTIC_LAB,
    billingUnit: BillingUnit.PER_TASK,
    basePrice: 8000,
  },
  {
    serviceCode: 'RAD_XRAY_CHEST',
    displayName: 'Chest X-Ray',
    department: ServiceDepartment.RADIOLOGY,
    taskCategory: EmergencyTaskCategory.DIAGNOSTIC_RADIOLOGY,
    billingUnit: BillingUnit.PER_TASK,
    basePrice: 30000,
  },
  {
    serviceCode: 'SONAR_ABDOMINAL',
    displayName: 'Abdominal Sonar',
    department: ServiceDepartment.SONAR,
    taskCategory: EmergencyTaskCategory.DIAGNOSTIC_SONAR,
    billingUnit: BillingUnit.PER_TASK,
    basePrice: 35000,
  },
  {
    serviceCode: 'ECG_STANDARD',
    displayName: '12-Lead ECG',
    department: ServiceDepartment.ECG,
    taskCategory: EmergencyTaskCategory.DIAGNOSTIC_ECG,
    billingUnit: BillingUnit.PER_TASK,
    basePrice: 20000,
  },
  {
    serviceCode: 'ER_ADMISSION_FEE',
    displayName: 'ER Admission Fee',
    department: ServiceDepartment.ER,
    taskCategory: EmergencyTaskCategory.BED_USAGE,
    billingUnit: BillingUnit.PER_TASK,
    basePrice: 10000,
  },
  {
    serviceCode: 'ER_BED_HOURLY',
    displayName: 'ER Bed Hourly Rate',
    department: ServiceDepartment.ER,
    taskCategory: EmergencyTaskCategory.BED_USAGE,
    billingUnit: BillingUnit.PER_HOUR,
    basePrice: 10000,
  },
]

async function main() {
  console.log('Seeding ServiceCatalog...')

  for (const service of SERVICES) {
    await prisma.serviceCatalog.upsert({
      where: { serviceCode: service.serviceCode },
      update: {
        displayName: service.displayName,
        department: service.department,
        taskCategory: service.taskCategory,
        billingUnit: service.billingUnit,
        basePrice: service.basePrice,
        currency: 'IQD',
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        ...service,
        currency: 'IQD',
        isActive: true,
      },
    })
  }

  console.log(`ServiceCatalog seed complete (${SERVICES.length} services).`)
}

main()
  .catch(async (error) => {
    console.error('ServiceCatalog seed failed:', error)
    await prisma.$disconnect()
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
