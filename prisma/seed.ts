import {
  PrismaClient,
  UserRole,
  VisitStatus,
  MedicationOrderStatus,
  Prisma,
} from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/** Matches `src/lib/billing/erAdmission.ts` — ER bills use this service code once per bill. */
const ER_ADMISSION_SERVICE_CODE = 'ER_ADMISSION_FEE'
const MANDATORY_FEE_IQD = 10_000

/**
 * Single password for **all** seeded accounts (UAT / supervisor demo).
 * Bcrypt-hashed before persistence.
 */
export const NARS_SEED_TEMP_PASSWORD = 'Zion@2026'

/** Demo patients + visits created under this phone prefix; removed on re-seed for idempotency on Supabase. */
const SEED_PATIENT_PHONE_PREFIX = '+964770001'

type SeedUser = {
  email: string
  name: string
  role: UserRole
  phone: string
  department: string
}

const SEED_USERS: SeedUser[] = [
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
  {
    email: 'accountant@zionmed.com',
    name: 'Hospital Accountant',
    role: UserRole.ACCOUNTANT,
    phone: '+964 750 000 0006',
    department: 'Accounts / Finance',
  },
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
  {
    email: 'intake@zionmed.com',
    name: 'Intake Nurse',
    role: UserRole.INTAKE_NURSE,
    phone: '+964 750 000 0003',
    department: 'Clinical / Intake',
  },
  {
    email: 'er-intake@zion.com',
    name: 'ER Vitals Station',
    role: UserRole.ER_INTAKE_NURSE,
    phone: '+964 750 000 0014',
    department: 'Emergency / Vitals station',
  },
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
  {
    email: 'doctor@zionmed.com',
    name: 'Dr. Sarah Al-Masri',
    role: UserRole.DOCTOR,
    phone: '+964 750 000 0004',
    department: 'Clinical / Internal Medicine',
  },
  {
    email: 'doctor@zion.med',
    name: 'Dr. Karim Al-Najjar',
    role: UserRole.DOCTOR,
    phone: '+964 750 000 0011',
    department: 'Emergency / Physician',
  },
  {
    email: 'secretary@zionmed.com',
    name: 'Medical Secretary',
    role: UserRole.SECRETARY,
    phone: '+964 750 000 0008',
    department: 'Clinical / Secretary & clinic queue',
  },
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
  {
    email: 'radio@zion.com',
    name: 'Radiology Technician',
    role: UserRole.RADIOLOGY_TECH,
    phone: '+964 750 000 0013',
    department: 'Diagnostics / Radiology',
  },
  {
    email: 'security@zionmed.com',
    name: 'Security Guard',
    role: UserRole.SECURITY,
    phone: '+964 750 000 0009',
    department: 'Security / Gatekeeper',
  },
]

type DemoTrack = 'ER' | 'CLINIC' | 'LAB' | 'PHARMACY' | 'DISCHARGED_PAID'

type DemoScenario = {
  phoneSuffix: string
  firstName: string
  lastName: string
  gender: string
  dateOfBirth: Date
  triageLevel: number | null
  allergies: string | null
  track: DemoTrack
  status: VisitStatus
  chiefComplaint: string
  diagnosis: string
  prescription: string | null
  /** Plain SOAP-style text for privacy-wall tests (linked to `doctorId` on Visit). */
  clinicalNotes: string
  /** `true` = assign ER physician; `false` = internal medicine physician. */
  assignErDoctor: boolean
  vitals: { bp: string; temperature: number; heartRate: number; weight: number; spo2?: number } | null
  notesJson: string | null
  billPaid: boolean
  /** Unique when paid; omit for Pending bills (qrCode null). */
  exitQrCode?: string | null
  medicationOrder: 'NONE' | 'PENDING' | 'DISPENSED'
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    phoneSuffix: '001',
    firstName: 'Layla',
    lastName: 'Hassan',
    gender: 'Female',
    dateOfBirth: new Date('1988-03-12'),
    triageLevel: 2,
    allergies: 'Penicillin',
    track: 'ER',
    status: VisitStatus.REGISTERED,
    chiefComplaint: 'Emergency: severe chest tightness since 2 hours ago',
    diagnosis: 'Rule out ACS; serial troponins ordered',
    prescription: null,
    clinicalNotes:
      'ER attending assessment. History obtained at bedside; ECG shows sinus rhythm. Patient counseled. Attending physician ID on record for clinical audit.',
    assignErDoctor: true,
    vitals: { bp: '148/92', temperature: 37.2, heartRate: 96, weight: 68, spo2: 97 },
    notesJson: JSON.stringify({
      erOrders: [{ type: 'NURSE', content: 'IV access established', at: new Date().toISOString() }],
    }),
    billPaid: false,
    medicationOrder: 'NONE',
  },
  {
    phoneSuffix: '002',
    firstName: 'Omar',
    lastName: 'Al-Rashid',
    gender: 'Male',
    dateOfBirth: new Date('1975-11-02'),
    triageLevel: 3,
    allergies: null,
    track: 'ER',
    status: VisitStatus.WAITING_FOR_DOCTOR,
    chiefComplaint: 'Emergency: road traffic accident — left knee pain and swelling',
    diagnosis: 'Soft tissue injury; X-ray knee ordered',
    prescription: null,
    clinicalNotes:
      'Orthopedic review documented. Clinical correlation with imaging pending. Linked to treating physician for privacy wall verification.',
    assignErDoctor: true,
    vitals: { bp: '122/78', temperature: 36.9, heartRate: 82, weight: 82 },
    notesJson: JSON.stringify({ doctorLabTests: 'Knee X-ray AP/Lateral' }),
    billPaid: false,
    medicationOrder: 'NONE',
  },
  {
    phoneSuffix: '003',
    firstName: 'Noor',
    lastName: 'Mahdi',
    gender: 'Female',
    dateOfBirth: new Date('1992-07-21'),
    triageLevel: 3,
    allergies: 'Shellfish',
    track: 'ER',
    status: VisitStatus.WITH_DOCTOR,
    chiefComplaint: 'ER: acute migraine with photophobia',
    diagnosis: 'Migraine without aura',
    prescription: 'Sumatriptan 50 mg PO x1 if headache persists (ER protocol)',
    clinicalNotes:
      'Neurological exam non-focal. Discharge planning discussed. Physician-specific clinical note retained for RBAC clinical access tests.',
    assignErDoctor: true,
    vitals: { bp: '118/74', temperature: 36.6, heartRate: 72, weight: 59 },
    notesJson: null,
    billPaid: false,
    medicationOrder: 'NONE',
  },
  {
    phoneSuffix: '004',
    firstName: 'Yusuf',
    lastName: 'Kadhim',
    gender: 'Male',
    dateOfBirth: new Date('1963-01-30'),
    triageLevel: 4,
    allergies: null,
    track: 'ER',
    status: VisitStatus.Billing,
    chiefComplaint: 'Emergency: dehydration after gastroenteritis',
    diagnosis: 'Acute viral gastroenteritis, improving',
    prescription: 'ORS sachets; bland diet',
    clinicalNotes:
      'IV fluids completed in ER bay. Stable for discharge after billing clearance. Clinical documentation tied to ER physician user.',
    assignErDoctor: true,
    vitals: { bp: '110/70', temperature: 37.4, heartRate: 88, weight: 74 },
    notesJson: null,
    billPaid: false,
    medicationOrder: 'NONE',
  },
  {
    phoneSuffix: '005',
    firstName: 'Hanan',
    lastName: 'Ibrahim',
    gender: 'Female',
    dateOfBirth: new Date('1958-05-16'),
    triageLevel: 3,
    allergies: 'Sulfa drugs',
    track: 'CLINIC',
    status: VisitStatus.Waiting,
    chiefComplaint: 'Internal Medicine follow-up: uncontrolled hypertension',
    diagnosis: 'Essential hypertension — suboptimal control on current regimen',
    prescription: 'Continue amlodipine; add HCTZ 12.5 mg daily',
    clinicalNotes:
      'Outpatient internal medicine note: BP log reviewed. Lifestyle counseling. This narrative must remain invisible to non-clinical roles per privacy policy.',
    assignErDoctor: false,
    vitals: { bp: '158/96', temperature: 36.8, heartRate: 76, weight: 71 },
    notesJson: null,
    billPaid: false,
    medicationOrder: 'NONE',
  },
  {
    phoneSuffix: '006',
    firstName: 'Salim',
    lastName: 'Talabani',
    gender: 'Male',
    dateOfBirth: new Date('1970-09-08'),
    triageLevel: 4,
    allergies: null,
    track: 'CLINIC',
    status: VisitStatus.Waiting,
    chiefComplaint: 'Consultation: new-onset fatigue and polydipsia',
    diagnosis: 'Screen for dysglycemia — labs ordered',
    prescription: null,
    clinicalNotes:
      'Internal medicine consultation draft. Endocrine review planned. Doctor-patient attribution stored on Visit for RBAC testing.',
    assignErDoctor: false,
    vitals: null,
    notesJson: null,
    billPaid: false,
    medicationOrder: 'NONE',
  },
  {
    phoneSuffix: '007',
    firstName: 'Rana',
    lastName: 'Fadhil',
    gender: 'Female',
    dateOfBirth: new Date('1981-12-03'),
    triageLevel: 4,
    allergies: null,
    track: 'CLINIC',
    status: VisitStatus.In_Consultation,
    chiefComplaint: 'Internal Medicine: chronic cough > 3 weeks',
    diagnosis: 'Likely post-viral cough; CXR to exclude pneumonia',
    prescription: 'Guaifenesin syrup PRN',
    clinicalNotes:
      'Auscultation clear bilaterally. Shared decision-making documented. Clinical text bound to attending doctor ID.',
    assignErDoctor: false,
    vitals: { bp: '126/80', temperature: 37.0, heartRate: 70, weight: 63 },
    notesJson: null,
    billPaid: false,
    medicationOrder: 'NONE',
  },
  {
    phoneSuffix: '008',
    firstName: 'Tariq',
    lastName: 'Al-Saadi',
    gender: 'Male',
    dateOfBirth: new Date('1995-04-25'),
    triageLevel: 4,
    allergies: null,
    track: 'LAB',
    status: VisitStatus.OUT_FOR_TEST,
    chiefComplaint: 'Internal Medicine: abnormal LFTs on prior labs',
    diagnosis: 'Hepatic panel pending — patient sent to laboratory',
    prescription: null,
    clinicalNotes:
      'Laboratory pathway: fasting blood draw arranged. Physician note remains under clinical scope for privacy wall demo.',
    assignErDoctor: false,
    vitals: { bp: '120/76', temperature: 36.7, heartRate: 68, weight: 77 },
    notesJson: JSON.stringify({
      labResults: [
        {
          testType: 'Comprehensive metabolic panel',
          result: 'Pending collection',
          releasedToDoctorAt: null,
        },
      ],
    }),
    billPaid: false,
    medicationOrder: 'NONE',
  },
  {
    phoneSuffix: '009',
    firstName: 'Mays',
    lastName: 'Jabbar',
    gender: 'Female',
    dateOfBirth: new Date('1984-08-14'),
    triageLevel: 3,
    allergies: null,
    track: 'LAB',
    status: VisitStatus.READY_FOR_REVIEW,
    chiefComplaint: 'Internal Medicine: pre-operative CBC',
    diagnosis: 'Pre-op clearance — laboratory review',
    prescription: null,
    clinicalNotes:
      'Results released to physician inbox. Review documented for continuity of care. Linked patient and doctor identifiers for access control tests.',
    assignErDoctor: false,
    vitals: { bp: '114/72', temperature: 36.5, heartRate: 66, weight: 58 },
    notesJson: JSON.stringify({
      labResults: [
        {
          testType: 'CBC / differential',
          result: 'Hemoglobin 12.8 g/dL; WBC within reference range',
          releasedToDoctorAt: new Date().toISOString(),
        },
      ],
    }),
    billPaid: false,
    medicationOrder: 'NONE',
  },
  {
    phoneSuffix: '010',
    firstName: 'Basil',
    lastName: 'Nouri',
    gender: 'Male',
    dateOfBirth: new Date('2001-02-19'),
    triageLevel: 4,
    allergies: 'Aspirin (GI upset)',
    track: 'PHARMACY',
    status: VisitStatus.READY_FOR_PHARMACY,
    chiefComplaint: 'Internal Medicine: acute pharyngitis',
    diagnosis: 'Bacterial pharyngitis — antibiotic course prescribed',
    prescription: 'Amoxicillin 500 mg TID x 7 days; paracetamol PRN fever',
    clinicalNotes:
      'Strep screen positive in clinic record (demo). Prescription sent to pharmacy queue. Clinical note restricted from accountant/admin clinical APIs.',
    assignErDoctor: false,
    vitals: { bp: '118/76', temperature: 38.1, heartRate: 92, weight: 70 },
    notesJson: null,
    billPaid: false,
    medicationOrder: 'PENDING',
  },
  {
    phoneSuffix: '011',
    firstName: 'Dina',
    lastName: 'Karim',
    gender: 'Female',
    dateOfBirth: new Date('1979-06-07'),
    triageLevel: 4,
    allergies: null,
    track: 'PHARMACY',
    status: VisitStatus.Billing,
    chiefComplaint: 'Internal Medicine: osteoarthritis flare',
    diagnosis: 'OA knee — analgesic ladder',
    prescription: 'Diclofenac 75 mg SR OD x 5 days with PPI cover',
    clinicalNotes:
      'GI risk discussed. Pharmacy billing in progress. Physician-attributed clinical narrative for RBAC.',
    assignErDoctor: false,
    vitals: { bp: '132/84', temperature: 36.9, heartRate: 74, weight: 68 },
    notesJson: null,
    billPaid: false,
    medicationOrder: 'PENDING',
  },
  {
    phoneSuffix: '012',
    firstName: 'Khalid',
    lastName: 'Al-Mufti',
    gender: 'Male',
    dateOfBirth: new Date('1969-10-11'),
    triageLevel: 3,
    allergies: null,
    track: 'DISCHARGED_PAID',
    status: VisitStatus.COMPLETED,
    chiefComplaint: 'Internal Medicine: stable angina follow-up',
    diagnosis: 'Chronic stable angina — optimized medical therapy',
    prescription: 'Aspirin 75 mg OD; atorvastatin 20 mg ON',
    clinicalNotes:
      'Case completed. All balances cleared. Medications dispensed (demo). Discharge QR demonstration patient — clinical record complete.',
    assignErDoctor: false,
    vitals: { bp: '128/82', temperature: 36.6, heartRate: 68, weight: 85 },
    notesJson: null,
    billPaid: true,
    exitQrCode: 'SEED-ZION-EXIT-2026-001',
    medicationOrder: 'DISPENSED',
  },
  {
    phoneSuffix: '013',
    firstName: 'Samira',
    lastName: 'Hussein',
    gender: 'Female',
    dateOfBirth: new Date('1990-01-22'),
    triageLevel: 3,
    allergies: null,
    track: 'DISCHARGED_PAID',
    status: VisitStatus.COMPLETED,
    chiefComplaint: 'Emergency: minor laceration repair — stable',
    diagnosis: 'Simple laceration sutured; tetanus up to date',
    prescription: 'Cephalexin 500 mg QID x 3 days',
    clinicalNotes:
      'ER course completed; wound care instructions given. Paid invoice + CLEARED QR for security gate demo. ER physician of record on Visit.',
    assignErDoctor: true,
    vitals: { bp: '116/74', temperature: 36.8, heartRate: 74, weight: 62 },
    notesJson: null,
    billPaid: true,
    exitQrCode: 'SEED-ZION-EXIT-2026-002',
    medicationOrder: 'DISPENSED',
  },
]

function buildAdmissionBillItems(params: {
  isEr: boolean
  visitId: string
  generatedByUserId: string
}): Prisma.InputJsonValue {
  const nowIso = new Date().toISOString()
  if (params.isEr) {
    return [
      {
        id: `seed-er-adm-${params.visitId}`,
        department: 'ER',
        description: 'ER Admission Fee',
        quantity: 1,
        unitPrice: MANDATORY_FEE_IQD,
        total: MANDATORY_FEE_IQD,
        addedAt: nowIso,
        addedBy: params.generatedByUserId,
        serviceCode: ER_ADMISSION_SERVICE_CODE,
        billingUnit: 'PER_TASK',
      },
    ]
  }
  return [
    {
      id: `seed-consult-${params.visitId}`,
      department: 'Doctor',
      description: 'Consultation & Admission Fee (Internal Medicine)',
      quantity: 1,
      unitPrice: MANDATORY_FEE_IQD,
      total: MANDATORY_FEE_IQD,
      addedAt: nowIso,
      addedBy: params.generatedByUserId,
      serviceCode: null,
      billingUnit: 'PER_VISIT',
    },
  ]
}

async function seedInventorySample() {
  const drugs = [
    { drugName: 'Paracetamol 500mg', currentStock: 500, unit: 'tablet', pricePerUnit: 250, category: 'Analgesic' },
    { drugName: 'Amoxicillin 500mg', currentStock: 320, unit: 'capsule', pricePerUnit: 400, category: 'Antibiotic' },
    { drugName: 'Ibuprofen 400mg', currentStock: 400, unit: 'tablet', pricePerUnit: 300, category: 'NSAID' },
    { drugName: 'Omeprazole 20mg', currentStock: 280, unit: 'capsule', pricePerUnit: 350, category: 'Gastro' },
    { drugName: 'Cetirizine 10mg', currentStock: 200, unit: 'tablet', pricePerUnit: 200, category: 'Antihistamine' },
  ]
  for (const d of drugs) {
    await prisma.inventory.upsert({
      where: { drugName: d.drugName },
      create: {
        drugName: d.drugName,
        currentStock: d.currentStock,
        unit: d.unit,
        pricePerUnit: new Prisma.Decimal(d.pricePerUnit),
        minThreshold: 50,
        category: d.category,
      },
      update: {
        currentStock: d.currentStock,
        pricePerUnit: new Prisma.Decimal(d.pricePerUnit),
        category: d.category,
      },
    })
  }
}

async function main() {
  console.log('🌱 Seeding NARS / ZION Hospital (users + demo patients)...')
  const passwordHash = await bcrypt.hash(NARS_SEED_TEMP_PASSWORD, 12)

  for (const u of SEED_USERS) {
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
  }

  await prisma.systemSettings.upsert({
    where: { id: 'default' },
    create: { id: 'default', systemName: 'NARS Hospital', logoUrl: null },
    update: {},
  })

  const admin = await prisma.user.findUnique({ where: { email: 'admin@zionmed.com' } })
  const doctorClinic = await prisma.user.findUnique({ where: { email: 'doctor@zionmed.com' } })
  const doctorEr = await prisma.user.findUnique({ where: { email: 'doctor@zion.med' } })
  if (!admin?.id || !doctorClinic?.id || !doctorEr?.id) {
    throw new Error('Seed users missing: admin@zionmed.com, doctor@zionmed.com, or doctor@zion.med')
  }

  await seedInventorySample()

  const removed = await prisma.patient.deleteMany({
    where: { phone: { startsWith: SEED_PATIENT_PHONE_PREFIX } },
  })
  if (removed.count > 0) {
    console.log(`🗑️ Removed ${removed.count} prior seed patient(s) (${SEED_PATIENT_PHONE_PREFIX}*)`)
  }

  for (const row of DEMO_SCENARIOS) {
    const phone = `${SEED_PATIENT_PHONE_PREFIX}${row.phoneSuffix}`
    const doctorId = row.assignErDoctor ? doctorEr.id : doctorClinic.id
    const doctorLabel = row.assignErDoctor ? doctorEr.name : doctorClinic.name

    const notesCombined =
      row.notesJson != null
        ? (() => {
            try {
              const base = JSON.parse(row.notesJson) as Record<string, unknown>
              return JSON.stringify({
                ...base,
                clinicalNarrative: `${row.clinicalNotes} Attending: ${doctorLabel}.`,
              })
            } catch {
              return `${row.clinicalNotes} Attending: ${doctorLabel}.`
            }
          })()
        : `${row.clinicalNotes} Attending: ${doctorLabel}.`

    const patient = await prisma.patient.create({
      data: {
        firstName: row.firstName,
        lastName: row.lastName,
        dateOfBirth: row.dateOfBirth,
        gender: row.gender,
        phone,
        email: `seed.patient.${row.phoneSuffix}@zion-hospital.local`,
        address: 'Baghdad, Iraq',
        emergencyContact: 'Family contact on file',
        emergencyPhone: '+964770000999',
        bloodGroup: row.gender === 'Male' ? 'O+' : 'A+',
        allergies: row.allergies,
        medicalHistory: row.track === 'ER' ? 'No major chronic disease (demo)' : 'Hypertension / dyslipidemia (demo)',
        triageLevel: row.triageLevel,
      },
    })

    const visit = await prisma.visit.create({
      data: {
        patientId: patient.id,
        doctorId,
        status: row.status,
        chiefComplaint: row.chiefComplaint,
        diagnosis: row.diagnosis,
        prescription: row.prescription,
        notes: notesCombined,
        visitDate: new Date(),
        dischargeDate: row.billPaid ? new Date() : null,
        finalDisposition: row.billPaid ? 'Home — stable' : null,
      },
    })

    /** ER admission fee line vs clinic consultation line (see `src/lib/billing/erAdmission.ts`). */
    const isErAdmissionBill =
      row.track === 'ER' || (row.track === 'DISCHARGED_PAID' && row.assignErDoctor)
    const items = buildAdmissionBillItems({
      isEr: isErAdmissionBill,
      visitId: visit.id,
      generatedByUserId: admin.id,
    })

    await prisma.bill.create({
      data: {
        visitId: visit.id,
        patientId: patient.id,
        generatedBy: admin.id,
        items,
        subtotal: new Prisma.Decimal(MANDATORY_FEE_IQD),
        tax: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(MANDATORY_FEE_IQD),
        paymentStatus: row.billPaid ? 'Paid' : 'Pending',
        paymentMethod: row.billPaid ? 'Cash' : null,
        qrCode: row.billPaid ? row.exitQrCode! : null,
        paidAt: row.billPaid ? new Date() : null,
        qrStatus: row.billPaid ? 'CLEARED' : 'LOCKED',
      },
    })

    if (row.vitals) {
      await prisma.vitals.create({
        data: {
          patientId: patient.id,
          visitId: visit.id,
          recordedBy: doctorId,
          bp: row.vitals.bp,
          temperature: row.vitals.temperature,
          heartRate: row.vitals.heartRate,
          weight: row.vitals.weight,
          spo2: row.vitals.spo2 ?? null,
          recordingSource: row.track === 'ER' ? 'ER-Vitals' : 'Clinic-Intake',
        },
      })
    }

    if (row.medicationOrder === 'PENDING') {
      await prisma.medicationOrder.create({
        data: {
          visitId: visit.id,
          status: MedicationOrderStatus.PENDING,
          totalCost: new Prisma.Decimal(2500),
          items: [
            {
              name: 'Amoxicillin 500mg',
              medicineName: 'Amoxicillin 500mg',
              dosage: '500mg',
              frequency: 'TID',
              quantity: 21,
              unitPrice: 400,
              totalPrice: 8400,
              price: 400,
            },
          ],
        },
      })
    } else if (row.medicationOrder === 'DISPENSED') {
      await prisma.medicationOrder.create({
        data: {
          visitId: visit.id,
          status: MedicationOrderStatus.DISPENSED,
          totalCost: new Prisma.Decimal(1500),
          items: [
            {
              name: 'Paracetamol 500mg',
              medicineName: 'Paracetamol 500mg',
              dosage: '500mg',
              frequency: 'PRN',
              quantity: 20,
              unitPrice: 250,
              totalPrice: 5000,
              price: 250,
            },
          ],
          dispensedAt: new Date(),
        },
      })
    }

    console.log(`👤 Patient ${row.firstName} ${row.lastName} (${row.track}) — ${phone} / visit ${visit.status}`)
  }

  console.log(`✨ Seeding completed. Password for all users: ${NARS_SEED_TEMP_PASSWORD}`)
  console.log(`   Demo patients: ${DEMO_SCENARIOS.length} (phones ${SEED_PATIENT_PHONE_PREFIX}001–013)`)
  console.log('   Paid + CLEARED QR: Khalid Al-Mufti, Samira Hussein (security scanner demo).')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
