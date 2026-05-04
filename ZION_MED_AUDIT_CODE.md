# ZION MED Full System Audit (Source Bundle)

# FILE: prisma/schema.prisma

```
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// System-wide user tags / roles
// NOTE: We keep legacy values (RECEPTION) for backward-compatibility,
// but new features should use the explicit tags below.
enum UserRole {
  ADMIN
  DOCTOR

  // Front desk & coordination
  RECEPTION        // legacy
  RECEPTIONIST
  SECRETARY

  // Nursing
  INTAKE_NURSE
  ER_NURSE

  // Pharmacy & billing
  PHARMACIST
  ACCOUNTANT

  // Diagnostics
  LAB_TECH
  RADIOLOGY_TECH

  // Infrastructure / security
  SECURITY
}

enum VisitStatus {
  Waiting
  In_Consultation
  OUT_FOR_TEST      // Left room for Lab/X-ray; re-enter when results ready
  READY_FOR_REVIEW  // Lab/X-ray results uploaded; doctor can review without new number
  READY_FOR_PHARMACY
  Billing
  Discharged
  COMPLETED
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  name      String
  role      UserRole
  phone     String?
  address   String?  @db.Text
  education String?  @db.Text
  experience Int?    // Years of experience
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  visits         Visit[]
  generatedBills Bill[]      @relation("BillGenerator")
  issuedExitPasses ExitPass[] @relation("ExitPassIssuer")

  @@map("users")
}

model Patient {
  id              String   @id @default(cuid())
  firstName       String
  lastName        String
  dateOfBirth     DateTime
  gender          String
  phone           String
  email           String?
  address         String?
  emergencyContact String?
  emergencyPhone   String?
  bloodGroup      String?

  // Allergies are critical for safety â€“ free-text for now (can be structured later)
  allergies       String?  @db.Text

  // Current triage level snapshot (1 = Critical, 5 = Routine)
  triageLevel     Int?

  medicalHistory  String?  @db.Text
  // Ultrasound / sonar (DB columns). X-ray and formal sonar releases also live in Visit.notes JSON (radiologyResults / sonarResults).
  sonarStatus     String?
  sonarImage      String?  @db.Text
  sonarNotes      String?  @db.Text

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  visits          Visit[]
  triages         Triage[]
  bills           Bill[]
  vitals          Vitals[]
  exitPasses      ExitPass[]

  @@map("patients")
}

model Triage {
  id            String   @id @default(cuid())
  patientId     String
  symptoms      String   @db.Text
  aiAnalysis    String?  @db.Text
  priority      Int      @default(3) // 1 = Critical, 2 = High, 3 = Medium, 4 = Low
  vitalSigns    Json?    // Store BP, Temperature, Pulse, etc.
  notes         String?  @db.Text
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  patient       Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)

  @@map("triages")
}

model Visit {
  id            String      @id @default(cuid())
  patientId     String
  doctorId      String?
  status        VisitStatus @default(Waiting)
  chiefComplaint String?    @db.Text
  diagnosis     String?     @db.Text
  prescription  String?     @db.Text
  notes         String?     @db.Text
  finalDisposition String?
  visitDate     DateTime    @default(now())
  dischargeDate DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  patient       Patient     @relation(fields: [patientId], references: [id], onDelete: Cascade)
  doctor        User?       @relation(fields: [doctorId], references: [id])
  bill          Bill?
  exitPass      ExitPass?
  vitals        Vitals[]
  medicationOrders MedicationOrder[]

  @@map("visits")
}

// Pharmacy inventory â€“ production-grade stock with atomic dispense
model Inventory {
  id             String    @id @default(cuid())
  drugName       String    @unique
  currentStock   Int       @default(0)
  unit           String    @default("unit")  // e.g. box, bottle, strip
  pricePerUnit   Decimal   @db.Decimal(12, 2) @default(0)
  minThreshold   Int       @default(10)
  expiryDate     DateTime? // optional: when this batch expires
  batchNumber    String?   // optional: batch/lot number
  category       String?   // e.g. Tablets, Syrup, Injection
  deletedAt      DateTime? // soft-delete: nullify so MedicationOrder history is preserved
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  medicationOrders MedicationOrder[]

  @@map("inventory")
}

enum MedicationOrderStatus {
  PENDING
  DISPENSED
  OUT_OF_STOCK
  CLOSED  // Patient declined / end visit without dispensing â€” prescription kept in history
}

model MedicationOrder {
  id          String                @id @default(cuid())
  visitId     String                @unique
  inventoryId String?               // optional: link to Inventory (nullified if drug deleted)
  status      MedicationOrderStatus @default(PENDING)
  totalCost   Decimal                @db.Decimal(10, 2) @default(0)
  items       Json                   // [{ medicineName, dosage, quantity, unitPrice, totalPrice }]
  dispensedAt DateTime?
  outOfStockAt DateTime?
  createdAt   DateTime              @default(now())
  updatedAt   DateTime              @updatedAt

  visit       Visit                 @relation(fields: [visitId], references: [id], onDelete: Cascade)
  inventory   Inventory?            @relation(fields: [inventoryId], references: [id], onDelete: SetNull)

  @@map("medication_orders")
}

model Bill {
  id            String   @id @default(cuid())
  visitId       String   @unique
  patientId     String
  generatedBy   String   // User ID who generated the bill / invoice
  items         Json     // Array of bill items with description, quantity, price
  subtotal      Decimal  @db.Decimal(10, 2)
  tax           Decimal  @db.Decimal(10, 2) @default(0)
  discount      Decimal  @db.Decimal(10, 2) @default(0)
  total         Decimal  @db.Decimal(10, 2)
  paymentStatus String   @default("Pending") // Pending, Paid, Partial
  paymentMethod String?  // Cash, Card, UPI, etc.
  qrCode        String?  @unique // QR code for payment / exit verification
  qrStatus      String   @default("LOCKED") // LOCKED (Red) or CLEARED (Green) - controls exit gate
  paidAt        DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  visit         Visit   @relation(fields: [visitId], references: [id], onDelete: Cascade)
  patient       Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)
  generatedByUser User  @relation("BillGenerator", fields: [generatedBy], references: [id])

  @@map("bills")
}

model ExitPass {
  id            String   @id @default(cuid())
  visitId       String   @unique
  patientId     String
  issuedBy      String   // User ID who issued the pass
  qrCode        String   @unique // QR code for exit verification
  isValid       Boolean  @default(true)
  scannedAt     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  visit         Visit   @relation(fields: [visitId], references: [id], onDelete: Cascade)
  patient       Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)
  issuedByUser  User    @relation("ExitPassIssuer", fields: [issuedBy], references: [id])

  @@map("exit_passes")
}

// Vitals history â€“ every measurement is stored as a separate record
model Vitals {
  id         String   @id @default(cuid())
  patientId  String
  visitId    String?      // Optional: tie to a specific visit
  recordedBy String?      // User ID (Intake_Nurse / ER_Nurse / Doctor)

  bp         String       // e.g. "120/80"
  temperature Float       // Â°C
  heartRate  Int          // bpm
  weight     Float        // kg

  recordedAt DateTime @default(now())

  patient    Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)
  visit      Visit?  @relation(fields: [visitId], references: [id])

  @@map("vitals")
}

// Global Price Settings - Managed by Admin only
model PriceSettings {
  id            String   @id @default(cuid())
  serviceType   String   @unique // e.g., "consultation_general", "consultation_specialist", "xray", "ct_scan", "ultrasound"
  serviceName   String   // Display name
  category      String   // "Consultation", "Radiology", "Sonar"
  price         Decimal  @db.Decimal(10, 2)
  isActive      Boolean  @default(true)
  updatedBy     String   // User ID who last updated
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@map("price_settings")
}


```

# FILE: package.json

```
{
  "name": "zion-med",
  "version": "1.0.0",
  "description": "Zion Med - Premium Hospital Management System",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:seed": "npx tsx prisma/seed.ts",
    "create:pharmacist": "node scripts/create-pharmacist.js"
  },
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^5.7.1",
    "lucide-react": "^0.562.0",
    "next": "^14.0.4",
    "qrcode.react": "^4.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^3.8.0"
  },
  "devDependencies": {
    "@types/node": "^20.10.5",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.56.0",
    "eslint-config-next": "^14.0.4",
    "postcss": "^8.4.32",
    "prisma": "^5.7.1",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.3"
  }
}

```

# FILE: src/app/admin/departments/page.tsx

```
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Building2, Check, ChevronDown, Edit2, ExternalLink, LayoutGrid, Plus, X } from 'lucide-react'

type Department = {
  id: string
  name: string
  headEmployeeId: string
  headOfDepartmentName: string
  hodTag: string
  assignedEmployeeIds: string[]
  description: string
  color: string
  employeeCount: number
}

type Employee = {
  id: string
  name: string
  role?: string
  employeeTag?: string
  specialization?: string
  departmentName?: string
  searchableText?: string
}

type DepartmentForm = {
  name: string
  headEmployeeId: string
  headOfDepartmentName: string
  hodTag: string
  description: string
  color: string
  assignedEmployeeIds: string[]
}

type DepartmentFilterKey = 'laboratory' | 'radiology' | 'sonar' | 'any'

const EMPTY_FORM: DepartmentForm = {
  name: '',
  headEmployeeId: '',
  headOfDepartmentName: '',
  hodTag: '',
  description: '',
  color: '#7c3aed',
  assignedEmployeeIds: [],
}

function formatEmployeeTag(role?: string): string {
  const raw = String(role || '').trim()
  if (!raw) return 'Staff'
  const pretty = raw
    .toLowerCase()
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ')
  if (pretty.includes('Tech')) return `${pretty} Technician`
  return pretty
}

const DEPARTMENTS_STALE_MS = 5000
const EMPLOYEES_STALE_MS = 300000
let departmentsCache: { data: Department[]; ts: number } | null = null
let employeesCache: { data: Employee[]; ts: number } | null = null

function normalizeRole(value?: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function inferDepartmentFilter(name: string): DepartmentFilterKey {
  const key = normalizeRole(name)
  if (key.includes('radiology') || key.includes('x ray') || key.includes('xray')) return 'radiology'
  if (key.includes('sonar') || key.includes('ultrasound')) return 'sonar'
  if (key.includes('lab') || key.includes('laboratory')) return 'laboratory'
  return 'any'
}

function toDepartmentType(filterKey: DepartmentFilterKey): string {
  if (filterKey === 'laboratory') return 'laboratory'
  if (filterKey === 'radiology') return 'radiology'
  if (filterKey === 'sonar') return 'sonar'
  return ''
}

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [savingCreate, setSavingCreate] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [hoveredEditId, setHoveredEditId] = useState<string | null>(null)

  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailEditMode, setDetailEditMode] = useState(false)
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null)

  const [showEmployeePicker, setShowEmployeePicker] = useState(false)
  const [pickerDirection, setPickerDirection] = useState<'up' | 'down'>('down')
  const [pickerRect, setPickerRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState<DepartmentForm>(EMPTY_FORM)
  const pickerAnchorRef = useRef<HTMLDivElement | null>(null)
  const bootedRef = useRef(false)

  const selectedDepartment = useMemo(
    () => departments.find((d) => d.id === selectedDepartmentId) || null,
    [departments, selectedDepartmentId]
  )
  const activeDepartmentName = useMemo(
    () => form.name.trim() || selectedDepartment?.name || '',
    [form.name, selectedDepartment]
  )

  const employeeNameById = useMemo(() => {
    return new Map(employees.map((e) => [e.id, e.name]))
  }, [employees])

  const filteredEmployees = useMemo(() => employees, [employees])

  const loadDepartments = async () => {
    const res = await fetch('/api/departments', { cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Failed to load departments')
    const rows = Array.isArray(data?.departments) ? data.departments : []
    const mapped = rows.map((r: any) => ({
      id: String(r.id),
      name: String(r.name || ''),
      headEmployeeId: String(r.headEmployeeId || ''),
      headOfDepartmentName: String(r.headOfDepartmentName || ''),
      hodTag: String(r.hodTag || 'Department Lead'),
      assignedEmployeeIds: Array.isArray(r.assignedEmployeeIds) ? r.assignedEmployeeIds.map(String) : [],
      description: String(r.description || ''),
      color: String(r.color || '#7c3aed'),
      employeeCount: Number(r.employeeCount || 0),
    }))
    departmentsCache = { data: mapped, ts: Date.now() }
    setDepartments(mapped)
  }

  const loadEmployees = async (departmentName?: string) => {
    const filter = inferDepartmentFilter(departmentName || '')
    const departmentType = toDepartmentType(filter)
    const endpoint = departmentType ? `/api/employees?departmentType=${encodeURIComponent(departmentType)}` : '/api/employees'
    const res = await fetch(endpoint, { cache: 'no-store' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || 'Failed to load employees')
    const rows = Array.isArray(data?.employees) ? data.employees : Array.isArray(data) ? data : []
    const mapped = rows.map((e: any) => {
      const role = String(e.role || e.role_tag || '')
      const departmentName = String(e.department_name || e.departmentName || '')
      const specialization = String(e.specialization || '')
      const employeeTag = String(e.employeeTag || e.roleTag || specialization || formatEmployeeTag(role))
      const aliases = [
        role,
        employeeTag,
        specialization,
        departmentName,
        employeeTag.replace(/\s+/g, ''),
        employeeTag.replace(/technician/i, 'tech'),
        employeeTag.replace(/tech/i, 'technician'),
      ].join(' ')
      return {
        id: String(e.id || e.userId || ''),
        name: String(e.name || ''),
        role,
        employeeTag,
        specialization,
        departmentName,
        searchableText: `${String(e.name || '')} ${aliases}`.toLowerCase(),
      }
    })
    if (!departmentType) {
      employeesCache = { data: mapped, ts: Date.now() }
    }
    setEmployees(mapped)
  }

  useEffect(() => {
    if (bootedRef.current) return
    bootedRef.current = true
    const boot = async () => {
      const now = Date.now()
      const hasFreshDepartments = !!departmentsCache && now - departmentsCache.ts < DEPARTMENTS_STALE_MS

      // Instant paint from cache on back-navigation
      if (hasFreshDepartments) setDepartments(departmentsCache!.data)
      if (hasFreshDepartments) setLoading(false)

      try {
        if (!hasFreshDepartments) setLoading(true)
        // Departments are required for page paint; employees are lazy-loaded on modal open.
        if (hasFreshDepartments) {
          void loadDepartments().catch(() => null)
        } else {
          await loadDepartments()
        }
      } catch (e: any) {
        alert(e?.message || 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }
    boot()
  }, [])

  const ensureEmployeesLoaded = async (departmentName?: string) => {
    const filter = inferDepartmentFilter(departmentName || '')
    const allowCache = filter === 'any'
    const now = Date.now()
    const hasFreshEmployees = !!employeesCache && now - employeesCache.ts < EMPLOYEES_STALE_MS
    if (allowCache && hasFreshEmployees) {
      setEmployees(employeesCache!.data)
      return
    }
    await loadEmployees(departmentName)
  }

  const validate = (requireHead = true) => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Department Name is required'
    if (requireHead && !form.headEmployeeId.trim()) next.head = 'Head of Department is required'
    if (!form.assignedEmployeeIds.length) next.staff = 'Select at least one employee'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setErrors({})
    setShowEmployeePicker(false)
  }

  const toggleEmployee = (id: string) => {
    setForm((prev) => ({
      ...prev,
      assignedEmployeeIds: prev.assignedEmployeeIds.includes(id)
        ? prev.assignedEmployeeIds.filter((x) => x !== id)
        : [...prev.assignedEmployeeIds, id],
    }))
  }

  const setHeadFromEmployee = (employeeId: string) => {
    const employee = employees.find((e) => e.id === employeeId)
    setForm((prev) => ({
      ...prev,
      headEmployeeId: employeeId,
      headOfDepartmentName: employee?.name || prev.headOfDepartmentName,
      hodTag: prev.hodTag || employee?.employeeTag || prev.hodTag,
    }))
  }

  const handleCreateDepartment = async () => {
    if (!validate(false)) return
    try {
      setSavingCreate(true)
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to create department')
      await loadDepartments()
      setShowAddModal(false)
      resetForm()
    } catch (e: any) {
      alert(e?.message || 'Failed to create department')
    } finally {
      setSavingCreate(false)
    }
  }

  const openDepartmentDetail = (dept: Department) => {
    setSelectedDepartmentId(dept.id)
    setDetailEditMode(false)
    setShowDetailModal(true)
    setForm({
      name: dept.name,
      headEmployeeId: dept.headEmployeeId || '',
      headOfDepartmentName: dept.headOfDepartmentName,
      hodTag: dept.hodTag,
      description: dept.description,
      color: dept.color,
      assignedEmployeeIds: dept.assignedEmployeeIds,
    })
    setErrors({})
    setShowEmployeePicker(false)
    void ensureEmployeesLoaded(dept.name)
  }

  const handleSaveDepartmentChanges = async () => {
    if (!selectedDepartment || !validate()) return
    const payload = {
      name: form.name,
      headEmployeeId: form.headEmployeeId,
      headOfDepartmentName: form.headOfDepartmentName,
      hodTag: form.hodTag,
      description: form.description,
      color: form.color,
      assignedEmployeeIds: form.assignedEmployeeIds,
    }

    try {
      setSavingEdit(true)
      const res = await fetch(`/api/departments/${encodeURIComponent(selectedDepartment.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || 'Failed to save changes')
      await loadDepartments()
      setDetailEditMode(false)
      setShowDetailModal(false)
      setSelectedDepartmentId(null)
      resetForm()
    } catch (e: any) {
      alert(e?.message || 'Failed to save changes')
    } finally {
      setSavingEdit(false)
    }
  }

  const getDepartmentHref = (name: string) => {
    const key = name.trim().toLowerCase()
    if (key.includes('reception')) return '/admin/reception'
    if (key.includes('pharmacy')) return '/admin/pharmacy'
    if (key.includes('laboratory') || key === 'lab') return '/admin/lab'
    if (key.includes('sonar') || key.includes('ultrasound')) return '/radiology?tab=sonar'
    if (key.includes('radiology') || key.includes('x-ray') || key.includes('xray')) return '/radiology'
    if (key.includes('account')) return '/accountant'
    if (key.includes('gate') || key.includes('security')) return '/gatekeeper'
    if (key.includes('inpatient') || key.includes('intake')) return '/intake'
    return '/admin'
  }

  const handleEnterDepartment = (name: string) => {
    const href = getDepartmentHref(name)
    sessionStorage.setItem('adminOverride', 'true')
    sessionStorage.setItem('adminReturnPath', '/admin/departments')
    window.location.href = href
  }

  const renderEmployeePicker = () => (
    <div className="relative" ref={pickerAnchorRef}>
      <button
        type="button"
        onClick={async () => {
          const next = !showEmployeePicker
          if (next) await ensureEmployeesLoaded(activeDepartmentName)
          setShowEmployeePicker(next)
        }}
        className="flex h-14 w-full items-center justify-between rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 text-left text-slate-200"
      >
        <span className="text-sm">
          {form.assignedEmployeeIds.length ? `${form.assignedEmployeeIds.length} employee(s) selected` : 'Select employees'}
        </span>
        <ChevronDown size={16} className="text-slate-400" />
      </button>
      {showEmployeePicker && pickerRect
        ? createPortal(
            <div
              className="fixed z-[120] rounded-xl border border-emerald-500/40 bg-[#081112] p-2 shadow-[0_0_28px_rgba(16,185,129,0.25)]"
              style={{
                left: pickerRect.left,
                width: pickerRect.width,
                top: pickerDirection === 'down' ? pickerRect.top + 8 : undefined,
                bottom: pickerDirection === 'up' ? window.innerHeight - pickerRect.top + 8 : undefined,
              }}
            >
              <div className="sticky top-0 z-10 mb-2 rounded-lg border border-emerald-500/30 bg-[#081112] p-1">
                <div className="rounded-lg border border-emerald-500/25 bg-[#0b1818]/90 px-3 py-2">
                  <p className="text-xs text-emerald-300">
                    Available staff for {activeDepartmentName || 'this department'}
                  </p>
                </div>
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                {filteredEmployees.map((employee) => {
                  const checked = form.assignedEmployeeIds.includes(employee.id)
                  return (
                    <button
                      key={employee.id}
                      type="button"
                      onClick={() => toggleEmployee(employee.id)}
                      className="flex w-full items-center justify-between rounded-lg border border-transparent px-3 py-2 text-left hover:border-emerald-500/30 hover:bg-emerald-500/10"
                    >
                      <span>
                        <span className="block text-sm text-slate-100">{employee.name}</span>
                        <span className="block text-xs text-slate-400">{employee.employeeTag || employee.role || 'Staff'}</span>
                      </span>
                      <span className={`flex h-5 w-5 items-center justify-center rounded border ${checked ? 'border-emerald-400 bg-emerald-500/30 text-emerald-100' : 'border-slate-600 text-transparent'}`}>
                        <Check size={13} />
                      </span>
                    </button>
                  )
                })}
              </div>
              {!filteredEmployees.length ? (
                <div className="mt-2 rounded-lg border border-slate-700/60 bg-slate-900/50 px-3 py-2 text-xs text-slate-300">
                  No technicians registered for this department yet
                </div>
              ) : null}
            </div>,
            document.body
          )
        : null}
      {errors.staff ? <p className="mt-1 text-xs text-rose-400">{errors.staff}</p> : null}
    </div>
  )

  useEffect(() => {
    if (!showEmployeePicker) return

    const updatePickerPosition = () => {
      const anchor = pickerAnchorRef.current
      if (!anchor) return
      const r = anchor.getBoundingClientRect()
      const estimatedHeight = 260
      const spaceBelow = window.innerHeight - r.bottom
      const openUp = spaceBelow < estimatedHeight && r.top > estimatedHeight
      setPickerDirection(openUp ? 'up' : 'down')
      setPickerRect({
        left: r.left,
        width: r.width,
        top: openUp ? r.top : r.bottom,
      })
    }

    updatePickerPosition()
    window.addEventListener('resize', updatePickerPosition)
    window.addEventListener('scroll', updatePickerPosition, true)
    return () => {
      window.removeEventListener('resize', updatePickerPosition)
      window.removeEventListener('scroll', updatePickerPosition, true)
    }
  }, [showEmployeePicker])

  return (
    <div className="min-h-full bg-slate-950">
      <main className="p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-primary">
              <Building2 size={26} className="text-indigo-400" />
              Departments
            </h1>
            <p className="mt-1 text-sm text-secondary">All hospital departments and structure overview.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetForm()
              void ensureEmployeesLoaded(form.name)
              setShowAddModal(true)
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/35 bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-[0_0_28px_rgba(99,102,241,0.35)] transition-all hover:from-violet-700 hover:to-indigo-700 hover:shadow-[0_0_40px_rgba(99,102,241,0.45)]"
          >
            <Plus size={18} />
            Add New Department
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <div className="mb-4 h-16 w-16 animate-pulse rounded-xl bg-slate-800/80" />
                <div className="mb-6 h-7 w-2/3 animate-pulse rounded bg-slate-800/80" />
                <div className="h-10 w-full animate-pulse rounded-xl bg-slate-800/80" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {departments.map((dept) => (
              <article
                key={dept.id}
                className="relative rounded-2xl border border-slate-800 bg-slate-900/40 p-6 transition-all duration-200 hover:scale-[1.02] hover:border-slate-700/60"
              >
                <div className="absolute right-14 top-4 rounded-lg border border-teal-500/40 bg-teal-500/20 px-2.5 py-1">
                  <span className="text-xs font-medium text-teal-300">Admin Access</span>
                </div>
                <button
                  type="button"
                  aria-label={`Edit ${dept.name}`}
                  onClick={() => openDepartmentDetail(dept)}
                  onMouseEnter={() => setHoveredEditId(dept.id)}
                  onMouseLeave={() => setHoveredEditId(null)}
                  className="absolute right-4 top-4 rounded-lg border border-slate-700/60 bg-slate-900/70 p-2 text-slate-400 transition-all"
                  style={
                    hoveredEditId === dept.id
                      ? {
                          color: dept.color,
                          borderColor: `${dept.color}88`,
                          boxShadow: `0 0 14px ${dept.color}44`,
                        }
                      : undefined
                  }
                >
                  <Edit2 size={14} />
                </button>
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl shadow-lg" style={{ background: `linear-gradient(135deg, ${dept.color}, ${dept.color}CC)` }}>
                  <LayoutGrid size={30} className="text-white" strokeWidth={1.6} />
                </div>
                <h2 className="mb-6 text-3xl font-bold text-white sm:text-2xl">{dept.name}</h2>
                <button
                  type="button"
                  onClick={() => handleEnterDepartment(dept.name)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white shadow-md transition-opacity hover:opacity-95"
                  style={{ background: `linear-gradient(90deg, ${dept.color}, ${dept.color}DD)` }}
                >
                  <ExternalLink size={18} />
                  Enter Department
                </button>
              </article>
            ))}
          </div>
        )}
      </main>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass w-full max-w-2xl rounded-2xl border border-slate-800/60 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-primary">Create New Department - Zion Med</h3>
              <button type="button" onClick={() => { setShowAddModal(false); resetForm() }} className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800/60 hover:text-slate-200" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Department Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-14 w-full rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                {errors.name ? <p className="mt-1 text-xs text-rose-400">{errors.name}</p> : null}
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Theme Color</label>
                <div className="flex h-14 items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-900/50 px-3">
                  <input type="color" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} className="h-9 w-14 cursor-pointer rounded border border-slate-700/50 bg-transparent p-0" />
                  <span className="text-sm text-slate-300">{form.color}</span>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-200">Add Employees</label>
                {renderEmployeePicker()}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2 border-t border-slate-800/50 pt-4">
              <button type="button" onClick={() => { setShowAddModal(false); resetForm() }} className="rounded-lg bg-slate-800/60 px-4 py-2 text-sm text-slate-200">Cancel</button>
              <button type="button" disabled={savingCreate} onClick={handleCreateDepartment} className="rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {savingCreate ? 'Saving...' : 'Save Department'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedDepartment ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="glass w-full max-w-2xl rounded-2xl border p-6" style={{ borderColor: `${(detailEditMode ? form.color : selectedDepartment.color) || '#7c3aed'}66` }}>
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-primary">Department Detail - Zion Med</h3>
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false)
                  setDetailEditMode(false)
                  setSelectedDepartmentId(null)
                  resetForm()
                }}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800/60 hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {!detailEditMode ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Department Name</p>
                  <p className="mt-1 text-lg font-bold text-white">{selectedDepartment.name}</p>
                  <p className="mt-2 text-sm text-slate-300">
                    Lead: <span className="text-slate-100">{selectedDepartment.headOfDepartmentName || 'Not assigned'}</span>{' '}
                    <span className="text-indigo-300">({selectedDepartment.hodTag})</span>
                  </p>
                </div>
                <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Description</p>
                  <p className="mt-1 text-sm text-slate-200">{selectedDepartment.description || 'No description'}</p>
                </div>
                <div className="rounded-xl border border-slate-700/50 bg-slate-900/40 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Assigned Employees</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedDepartment.assignedEmployeeIds.length ? selectedDepartment.assignedEmployeeIds.map((id) => (
                      <span key={id} className="rounded-full border border-slate-700/60 bg-slate-800/70 px-3 py-1 text-xs text-slate-200">
                        {employeeNameById.get(id) || id}
                      </span>
                    )) : <span className="text-sm text-slate-400">No assigned employees.</span>}
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-800/50 pt-4">
                  <button type="button" onClick={() => setShowDetailModal(false)} className="rounded-lg bg-slate-800/60 px-4 py-2 text-sm text-slate-200">Close</button>
                  <button
                    type="button"
                    onClick={() => setDetailEditMode(true)}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                    style={{ background: `linear-gradient(90deg, ${selectedDepartment.color}, ${selectedDepartment.color}DD)` }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">Department Name</label>
                    <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="h-14 w-full rounded-xl border border-slate-700/50 bg-slate-900/50 px-4 text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                    {errors.name ? <p className="mt-1 text-xs text-rose-400">{errors.name}</p> : null}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">Head of Department</label>
                    <select
                      value={form.headEmployeeId}
                      onChange={(e) => setHeadFromEmployee(e.target.value)}
                      className="h-14 w-full rounded-xl border border-emerald-500/30 bg-[#0d1718] px-4 text-slate-100 outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/25"
                    >
                      <option value="">Select Head of Department</option>
                      {filteredEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name} - {employee.employeeTag || employee.role || 'Staff'}
                        </option>
                      ))}
                    </select>
                    {errors.head ? <p className="mt-1 text-xs text-rose-400">{errors.head}</p> : null}
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">Theme Color</label>
                    <div className="flex h-14 items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-900/50 px-3">
                      <input type="color" value={form.color} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} className="h-9 w-14 cursor-pointer rounded border border-slate-700/50 bg-transparent p-0" />
                      <span className="text-sm text-slate-300">{form.color}</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">Add Employees</label>
                    {renderEmployeePicker()}
                  </div>
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-800/50 pt-4">
                  <button type="button" onClick={() => setDetailEditMode(false)} className="rounded-lg bg-slate-800/60 px-4 py-2 text-sm text-slate-200">Cancel</button>
                  <button
                    type="button"
                    disabled={savingEdit}
                    onClick={handleSaveDepartmentChanges}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    style={{ background: `linear-gradient(90deg, ${form.color}, ${form.color}DD)` }}
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}


```

# FILE: src/app/api/departments/route.ts

```
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function ensureDepartmentsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      color TEXT,
      head_employee_id TEXT,
      hod_name TEXT,
      hod_tag TEXT,
      employee_ids JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
  await prisma.$executeRawUnsafe(`ALTER TABLE departments ADD COLUMN IF NOT EXISTS description TEXT`)
  await prisma.$executeRawUnsafe(`ALTER TABLE departments ADD COLUMN IF NOT EXISTS color TEXT`)
  await prisma.$executeRawUnsafe(`ALTER TABLE departments ADD COLUMN IF NOT EXISTS head_employee_id TEXT`)
  await prisma.$executeRawUnsafe(`ALTER TABLE departments ADD COLUMN IF NOT EXISTS hod_name TEXT`)
  await prisma.$executeRawUnsafe(`ALTER TABLE departments ADD COLUMN IF NOT EXISTS hod_tag TEXT`)
  await prisma.$executeRawUnsafe(`ALTER TABLE departments ADD COLUMN IF NOT EXISTS employee_ids JSONB`)
  await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id TEXT`)
}

async function syncUsersDepartmentId(departmentId: string, assignedEmployeeIds: string[]) {
  if (!assignedEmployeeIds.length) return
  await prisma.$executeRawUnsafe(
    `UPDATE users
     SET department_id = $1
     WHERE id = ANY($2::text[])`,
    departmentId,
    assignedEmployeeIds
  )
}

type DeptRow = {
  id: string
  name: string
  description: string | null
  color: string | null
  head_employee_id: string | null
  hod_name: string | null
  hod_tag: string | null
  employee_ids: unknown
  created_at: string
}

const SYSTEM_DEPARTMENTS: Array<{ name: string; description: string; color: string }> = [
  { name: 'Emergency', description: 'Critical and urgent patient care.', color: '#ef4444' },
  { name: 'Reception', description: 'Registration, booking, and front-desk workflow.', color: '#0ea5e9' },
  { name: 'Pharmacy', description: 'Medication dispensing and prescription handling.', color: '#10b981' },
  { name: 'Laboratory', description: 'Lab requests and diagnostic result processing.', color: '#8b5cf6' },
  { name: 'Radiology', description: 'Imaging workflows including X-ray and scans.', color: '#6366f1' },
  { name: 'Intake', description: 'Initial assessment and triage intake process.', color: '#f59e0b' },
  { name: 'Security', description: 'Access control and gatekeeping operations.', color: '#f97316' },
  { name: 'Accounting', description: 'Billing, payments, and financial operations.', color: '#14b8a6' },
]

function parseEmployeeIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === 'string')
  if (typeof value === 'string' && value) {
    try {
      const p = JSON.parse(value)
      if (Array.isArray(p)) return p.filter((x): x is string => typeof x === 'string')
    } catch {
      return []
    }
  }
  return []
}

async function ensureSystemDepartmentsSeeded() {
  for (const dept of SYSTEM_DEPARTMENTS) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO departments (id, name, description, color)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (name) DO NOTHING`,
      crypto.randomUUID(),
      dept.name,
      dept.description,
      dept.color
    )
  }
}

export async function GET() {
  try {
    await ensureDepartmentsTable()
    await ensureSystemDepartmentsSeeded()
    const rows = await prisma.$queryRawUnsafe<DeptRow[]>(
      `SELECT id, name, description, color, head_employee_id, hod_name, hod_tag, employee_ids, created_at
       FROM departments
       ORDER BY created_at DESC`
    )

    const fromDb = rows.map((d) => {
      const savedEmployeeIds = parseEmployeeIds(d.employee_ids)

      return {
        id: d.id,
        name: d.name,
        headEmployeeId: d.head_employee_id || '',
        description: d.description || 'No description yet.',
        color: d.color || '#4f46e5',
        headOfDepartmentName: d.hod_name || 'Not assigned',
        hodTag: d.hod_tag || 'Department Lead',
        assignedEmployeeIds: savedEmployeeIds,
        employeeCount: savedEmployeeIds.length,
        createdAt: d.created_at,
      }
    })
    return NextResponse.json({ success: true, departments: fromDb })
  } catch (error: any) {
    console.error('âŒ Error fetching departments:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch departments' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await ensureDepartmentsTable()
    const body = await request.json().catch(() => ({}))
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const description = typeof body?.description === 'string' ? body.description.trim() : ''
    const color = typeof body?.color === 'string' ? body.color.trim() : ''
    const headEmployeeId = typeof body?.headEmployeeId === 'string' ? body.headEmployeeId.trim() : ''
    const hodName = typeof body?.headOfDepartmentName === 'string' ? body.headOfDepartmentName.trim() : ''
    const hodTag = typeof body?.hodTag === 'string' ? body.hodTag.trim() : ''
    const assignedEmployeeIds = Array.isArray(body?.assignedEmployeeIds)
      ? body.assignedEmployeeIds.filter((x: unknown) => typeof x === 'string')
      : []
    if (!name) {
      return NextResponse.json({ error: 'Department name is required' }, { status: 400 })
    }

    const id = crypto.randomUUID()
    const rows = await prisma.$queryRawUnsafe<DeptRow[]>(
      `INSERT INTO departments (id, name, description, color, head_employee_id, hod_name, hod_tag, employee_ids)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       RETURNING id, name, description, color, head_employee_id, hod_name, hod_tag, employee_ids, created_at`,
      id,
      name,
      description || null,
      color || '#4f46e5',
      headEmployeeId || null,
      hodName || null,
      hodTag || null,
      JSON.stringify(assignedEmployeeIds)
    )

    await syncUsersDepartmentId(id, assignedEmployeeIds)

    return NextResponse.json({ success: true, department: rows[0] }, { status: 201 })
  } catch (error: any) {
    const msg = String(error?.message || '')
    if (msg.includes('duplicate key') || msg.includes('unique')) {
      return NextResponse.json({ error: 'Department already exists' }, { status: 409 })
    }
    console.error('âŒ Error creating department:', error)
    return NextResponse.json({ error: error?.message || 'Failed to create department' }, { status: 500 })
  }
}


```

# FILE: src/app/lab/page.tsx

```
'use client'
// FINAL STABLE VERSION - DO NOT MODIFY WITHOUT EXPLICIT PERMISSION FROM HAWRAA.

import { useEffect, useMemo, useRef, useState } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import BackButton from '@/components/BackButton'
import { USER_ROLES } from '@/contexts/AuthContext'
import { Printer } from 'lucide-react'
// MANDATORY SAFETY CHECK: CONFIRMATION MODAL.

type LabRequest = {
  id: string
  at: string
  visitId: string
  patientId: string
  patientName: string
  testType: string
  status: 'Pending' | 'Completed'
  result?: string
  completedAt?: string
}

type ApiLabRequest = {
  at: string
  testType: string
  status: 'Pending' | 'Completed'
  result?: string
}

type BedRow = {
  visitId: string | null
  patientId: string | null
  patientName: string | null
  labRequests: ApiLabRequest[]
}

const AUTO_LAB_RESULT = 'Blood Test: Hemoglobin 14.5 g/dL, WBC 7000 /uL'

export default function LabTechDashboard() {
  const [requests, setRequests] = useState<LabRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(true)
  const [confirmRow, setConfirmRow] = useState<LabRequest | null>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [confirmNotes, setConfirmNotes] = useState('')
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleRequests = useMemo(() => requests, [requests])

  const mapBedsToRequests = (beds: BedRow[]) => {
    return beds.flatMap((bed) =>
      (bed.labRequests || []).map((r) => ({
        id: `LAB-${bed.visitId || 'unknown'}-${r.at}`,
        at: r.at,
        visitId: bed.visitId || '',
        patientId: bed.patientId || '',
        patientName: bed.patientName || 'Unknown',
        testType: r.testType || 'Lab Test',
        status: r.status || 'Pending',
        result: r.result,
      }))
    )
  }

  const fetchRequests = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError(null)
      const res = await fetch(`/api/lab/er-beds?department=Lab`)
      const data = res.ok ? await res.json() : []
      const mapped = mapBedsToRequests(Array.isArray(data) ? data : [])
      setRequests(mapped)
    } catch (_) {
      setError('Failed to load lab queue.')
      setRequests([])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const bc = new BroadcastChannel('zion-diagnostic')
    bc.onmessage = (ev: MessageEvent) => {
      const d = ev.data as { type?: string; department?: string }
      if (d?.type === 'simulate-success' && d.department === 'Lab') {
        void fetchRequests(true)
      }
    }
    return () => bc.close()
  }, [])

  useEffect(() => {
    const pollAutoIngest = async () => {
      try {
        const res = await fetch('/api/diagnostic/auto-ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ department: 'Lab' }),
        })
        const data = (await res.json().catch(() => ({}))) as { ingested?: boolean }
        if (data.ingested) {
          showSuccessToast()
          await fetchRequests(true)
        }
        setIsListening(true)
      } catch (_) {
        setIsListening(false)
      }
    }
    pollAutoIngest()
    const interval = setInterval(pollAutoIngest, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const showSuccessToast = () => {
    setToast('Result sent to doctor successfully!')
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2200)
  }

  const removeRowWithAnimation = (id: string) => {
    setRemovingIds((prev) => new Set(prev).add(id))
    setTimeout(() => {
      setRequests((prev) => prev.filter((r) => r.id !== id))
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }, 220)
  }

  const completeLabRequest = async (row: LabRequest, resultText: string, technicianNotes?: string) => {
    try {
      if (!row.id.startsWith('MOCK-')) {
        const res = await fetch('/api/lab/er-beds/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitId: row.visitId,
            at: row.at,
            testType: row.testType,
            result: resultText,
            department: 'Lab',
            technicianNotes: technicianNotes?.trim() || undefined,
          }),
        })
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        if (!res.ok) throw new Error(data.error || 'Failed to save result')
      }
      setRequests((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, status: 'Completed', result: resultText } : r))
      )
      showSuccessToast()
      removeRowWithAnimation(row.id)
    } catch (err) {
      setError((err as Error)?.message || 'Failed to process request')
    }
  }

  // MANDATORY SAFETY CHECK: CONFIRMATION MODAL.
  const requestFinalizeWithConfirmation = (row: LabRequest) => {
    setConfirmRow(row)
    setConfirmNotes('')
  }

  const confirmFinalize = async () => {
    if (!confirmRow) return
    setConfirmBusy(true)
    try {
      await completeLabRequest(confirmRow, AUTO_LAB_RESULT, confirmNotes)
      setConfirmRow(null)
      setConfirmNotes('')
    } finally {
      setConfirmBusy(false)
    }
  }

  const simulateAutoImport = async () => {
    const firstPending = requests.find((r) => r.status === 'Pending')
    if (!firstPending) return
    await completeLabRequest(firstPending, AUTO_LAB_RESULT)
  }

  const handlePrint = (row: LabRequest) => {
    const printWindow = window.open('', '_blank', 'width=980,height=900')
    if (!printWindow) return
    const html = `
      <!doctype html>
      <html>
      <head>
        <title>ZION Lab Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
          .hospital { font-size: 22px; font-weight: 700; }
          .sub { color: #334155; margin-top: 4px; }
          .meta { margin: 14px 0; line-height: 1.7; }
          .result { margin-top: 10px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hospital">ZION Hospital</div>
          <div class="sub">Laboratory Result</div>
        </div>
        <div class="meta">
          <div><strong>Patient:</strong> ${row.patientName}</div>
          <div><strong>Patient ID:</strong> ${row.patientId}</div>
          <div><strong>Visit ID:</strong> ${row.visitId}</div>
          <div><strong>Test:</strong> ${row.testType}</div>
        </div>
        <div class="result">${row.result || AUTO_LAB_RESULT}</div>
        <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
      </body>
      </html>
    `
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.LAB_TECH, USER_ROLES.ADMIN]}>
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-6xl mx-auto space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-slate-100">ZION Hospital - Laboratory</h1>
                  <p className="text-xs text-slate-400">Compact pending lab queue</p>
                  <p className={`text-xs mt-1 ${isListening ? 'text-emerald-400' : 'text-amber-400'}`}>
                    Status: Listening for devices...
                  </p>
                </div>
                <button
                  type="button"
                  onClick={simulateAutoImport}
                  className="opacity-0 pointer-events-auto h-0 w-0 overflow-hidden"
                  aria-label="Auto Process"
                >
                  Auto-Process
                </button>
              </div>

              <section className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
                <h2 className="text-sm font-semibold text-slate-300 mb-3">Pending Tests</h2>
                {error && (
                  <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    {error}
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-700/70">
                        <th className="py-2 px-2 font-medium">Patient Name</th>
                        <th className="py-2 px-2 font-medium">Type</th>
                        <th className="py-2 px-2 font-medium">Time</th>
                        <th className="py-2 px-2 font-medium">Status</th>
                        <th className="py-2 px-2 font-medium">Result Preview</th>
                        <th className="py-2 px-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr><td colSpan={6} className="py-8 text-center text-slate-500">Loading lab queue...</td></tr>
                      )}
                      {!loading && visibleRequests.length === 0 && (
                        <tr><td colSpan={6} className="py-8 text-center text-slate-500">No pending lab requests.</td></tr>
                      )}
                      {visibleRequests.map((row) => (
                        <tr
                          key={row.id}
                          className={`border-b border-slate-800/70 transition-all duration-200 ${
                            removingIds.has(row.id) ? 'opacity-0 -translate-x-2' : 'opacity-100'
                          }`}
                        >
                          <td className="py-2 px-2">
                            <div className="text-slate-100 font-medium leading-5">{row.patientName}</div>
                            <div className="text-[11px] text-slate-500">{row.visitId}</div>
                          </td>
                          <td className="py-2 px-2 text-slate-300">{row.testType}</td>
                          <td className="py-2 px-2 text-slate-300 whitespace-nowrap">
                            {new Date(row.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2 px-2">
                            <span className="text-xs px-2 py-1 rounded bg-amber-500/20 text-amber-300">{row.status}</span>
                          </td>
                          <td className="py-2 px-2 text-xs text-slate-400 truncate max-w-[320px]">
                            {row.result || 'â€”'}
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => requestFinalizeWithConfirmation(row)}
                                className="px-2.5 py-1.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30"
                              >
                                Auto-Import
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrint(row)}
                                className="px-2.5 py-1.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-medium hover:bg-cyan-500/30 inline-flex items-center gap-1.5"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                Print
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
      {toast && (
        <div className="fixed top-4 right-4 z-[80] rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-xs text-emerald-200 shadow-lg">
          {toast}
        </div>
      )}
      {confirmRow && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-emerald-500/35 bg-slate-900/95 p-5 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
            <h3 className="text-base font-semibold text-slate-100">Confirm Final Results - Laboratory</h3>
            <p className="mt-2 text-sm text-slate-300">
              Are you sure you want to finalize these results for <span className="font-semibold">{confirmRow.patientName}</span>? This will send the data directly to the doctor's dashboard.
            </p>
            <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-950/40 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Result Summary</p>
              <div className="overflow-hidden rounded-lg border border-slate-700/60">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-slate-700/60">
                      <td className="px-3 py-2 text-slate-400">Patient</td>
                      <td className="px-3 py-2 text-slate-100">{confirmRow.patientName}</td>
                    </tr>
                    <tr className="border-b border-slate-700/60">
                      <td className="px-3 py-2 text-slate-400">Test Name</td>
                      <td className="px-3 py-2 text-slate-100">{confirmRow.testType}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-slate-400">Result</td>
                      <td className="px-3 py-2 text-slate-100">{AUTO_LAB_RESULT}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="lab-confirm-notes" className="mb-1 block text-sm font-medium text-slate-300">
                Technician Notes / Observations
              </label>
              <textarea
                id="lab-confirm-notes"
                rows={4}
                value={confirmNotes}
                onChange={(e) => setConfirmNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none"
                placeholder="Add any notes or clinical observations here (optional)..."
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={confirmBusy}
                onClick={() => {
                  setConfirmRow(null)
                  setConfirmNotes('')
                }}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel / Edit
              </button>
              <button
                type="button"
                disabled={confirmBusy}
                onClick={() => void confirmFinalize()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 hover:shadow-[0_0_16px_rgba(16,185,129,0.45)] disabled:opacity-50"
              >
                {confirmBusy ? 'Sendingâ€¦' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}
      <BackButton />
    </ProtectedRoute>
  )
}

```

# FILE: src/app/test-simulator/page.tsx

```
'use client'

import { useState, useEffect, useCallback } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import BackButton from '@/components/BackButton'
import { USER_ROLES } from '@/contexts/AuthContext'
import { FlaskConical, Radiation, Waves, RotateCcw } from 'lucide-react'

type SimDepartment = 'Radiology' | 'Sonar' | 'Lab'

type LabRequest = { at: string; testType: string; status: string }
type BedRow = {
  bedNumber: number
  visitId: string | null
  patientName: string | null
  labRequests: LabRequest[]
}

export default function TestSimulatorPage() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<SimDepartment | 'reset' | null>(null)
  const [sonarQueueRows, setSonarQueueRows] = useState<
    { bedNumber: number; patientName: string; visitId: string; testType: string; status: string }[]
  >([])

  const loadSonarQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/lab/er-beds?department=Sonar')
      const beds = (await res.json().catch(() => [])) as BedRow[]
      if (!Array.isArray(beds)) {
        setSonarQueueRows([])
        return
      }
      const rows: typeof sonarQueueRows = []
      for (const b of beds) {
        if (!b.visitId || !b.patientName) continue
        for (const r of b.labRequests || []) {
          rows.push({
            bedNumber: b.bedNumber,
            patientName: b.patientName,
            visitId: b.visitId,
            testType: r.testType || 'Sonar',
            status: r.status,
          })
        }
      }
      setSonarQueueRows(rows)
    } catch {
      setSonarQueueRows([])
    }
  }, [])

  useEffect(() => {
    void loadSonarQueue()
    const t = setInterval(() => void loadSonarQueue(), 4000)
    return () => clearInterval(t)
  }, [loadSonarQueue])

  const runSimulator = async (department: SimDepartment) => {
    setError(null)
    setMessage(null)
    setBusy(department)
    try {
      const res = await fetch('/api/test-simulator/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department }),
      })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string; error?: string }
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Simulation failed')
      }
      setMessage(data.message || 'Data sent from Device to ZION Server successfully!')
      if (department === 'Sonar') void loadSonarQueue()
      if (typeof BroadcastChannel !== 'undefined' && (department === 'Radiology' || department === 'Sonar' || department === 'Lab')) {
        new BroadcastChannel('zion-diagnostic').postMessage({ type: 'simulate-success', department })
      }
    } catch (e) {
      setError((e as Error)?.message || 'Failed to simulate')
    } finally {
      setBusy(null)
    }
  }

  const resetAll = async () => {
    setError(null)
    setMessage(null)
    setBusy('reset')
    try {
      const res = await fetch('/api/test-simulator/reset', { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string; error?: string }
      if (!res.ok || data.error) throw new Error(data.error || 'Reset failed')
      setMessage(data.message || 'All simulated data reset.')
    } catch (e) {
      setError((e as Error)?.message || 'Failed to reset')
    } finally {
      setBusy(null)
    }
  }

  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.RADIOLOGY_TECH, USER_ROLES.LAB_TECH]}>
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-100">ZION Testing / Simulator Dashboard</h1>
                  <p className="text-sm text-slate-400">Device simulation controls for Radiology, Sonar, and Lab</p>
                </div>
                <button
                  type="button"
                  onClick={resetAll}
                  disabled={busy === 'reset'}
                  className="px-4 py-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-sm font-medium hover:bg-rose-500/30 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  {busy === 'reset' ? 'Resetting...' : 'Reset All'}
                </button>
              </div>

              {message && (
                <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">
                  {message}
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <section className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Radiation className="h-5 w-5 text-sky-300" />
                    <h2 className="text-sm font-semibold text-slate-200">Radiology Simulator</h2>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">Assign chest X-ray image to first pending patient.</p>
                  <button
                    type="button"
                    onClick={() => runSimulator('Radiology')}
                    disabled={busy === 'Radiology'}
                    className="w-full px-3 py-2 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 text-sm font-medium hover:bg-sky-500/30 disabled:opacity-50"
                  >
                    {busy === 'Radiology' ? 'Processing...' : 'Simulate X-Ray Machine'}
                  </button>
                </section>

                <section className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FlaskConical className="h-5 w-5 text-amber-300" />
                    <h2 className="text-sm font-semibold text-slate-200">Lab Simulator</h2>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">Inject blood values: HB 14.2, WBC 6500.</p>
                  <button
                    type="button"
                    onClick={() => runSimulator('Lab')}
                    disabled={busy === 'Lab'}
                    className="w-full px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-medium hover:bg-amber-500/30 disabled:opacity-50"
                  >
                    {busy === 'Lab' ? 'Processing...' : 'Simulate Blood Analyzer'}
                  </button>
                </section>

                <section className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Waves className="h-5 w-5 text-violet-300" />
                    <h2 className="text-sm font-semibold text-slate-200">Sonar Simulator</h2>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    Creates or reuses a <span className="text-violet-200 font-medium">SONAR_REQUESTED</span> order and sets{' '}
                    <span className="text-violet-200 font-medium">patient.sonarStatus = COMPLETE</span> with a demo
                    sonarImage so the Doctor dashboard shows the study immediately. Technicians can still process the
                    formal queue on Imaging.
                  </p>
                  <button
                    type="button"
                    onClick={() => runSimulator('Sonar')}
                    disabled={busy === 'Sonar'}
                    className="w-full px-3 py-2 rounded-lg bg-violet-500/20 border border-violet-500/40 text-violet-300 text-sm font-medium hover:bg-violet-500/30 disabled:opacity-50"
                  >
                    {busy === 'Sonar' ? 'Processing...' : 'Simulate Sonar (queue request)'}
                  </button>
                </section>
              </div>

              <section className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Waves className="h-5 w-5 text-cyan-300" />
                  <h2 className="text-sm font-semibold text-slate-200">Sonar queue (live)</h2>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Pulled from <code className="text-slate-400">/api/lab/er-beds?department=Sonar</code>. Pending rows need
                  technician upload + review.
                </p>
                {sonarQueueRows.length === 0 ? (
                  <p className="text-sm text-slate-500">No sonar rows â€” click Simulate Sonar or request sonar from ER.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-800/80">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-800">
                          <th className="py-2 px-2">Bed</th>
                          <th className="py-2 px-2">Patient</th>
                          <th className="py-2 px-2">Type</th>
                          <th className="py-2 px-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sonarQueueRows.map((row, i) => (
                          <tr key={`${row.visitId}-${row.testType}-${i}`} className="border-b border-slate-800/60 text-slate-300">
                            <td className="py-2 px-2 tabular-nums">{row.bedNumber}</td>
                            <td className="py-2 px-2">{row.patientName}</td>
                            <td className="py-2 px-2">{row.testType}</td>
                            <td className="py-2 px-2">
                              <span
                                className={
                                  row.status === 'Pending'
                                    ? 'text-amber-300'
                                    : 'text-emerald-400'
                                }
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
      <BackButton />
    </ProtectedRoute>
  )
}

```

# FILE: src/app/api/test-simulator/simulate/route.ts

```
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import { DEMO_RADIOLOGY_XRAY_IMAGE_URL, DEMO_SONAR_ULTRASOUND_IMAGE_URL } from '@/config/demoDiagnosticImageUrls'

type Department = 'Radiology' | 'Sonar' | 'Lab'

type ResultEntry = {
  at?: string
  testType?: string
  result: string
  completedAt?: string
  attachmentPath?: string
}

const ORDER_TYPES: Record<Department, string[]> = {
  Radiology: ['RADIOLOGY_REQUESTED'],
  Sonar: ['SONAR_REQUESTED'],
  Lab: ['LAB', 'LAB_REQUESTED'],
}

const RESULT_KEYS: Record<Department, string> = {
  Radiology: 'radiologyResults',
  Sonar: 'sonarResults',
  Lab: 'labResults',
}

const ER_VISIT_FILTER = {
  status: { not: VisitStatus.Discharged } as const,
  OR: [
    { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' as const } },
    { chiefComplaint: { contains: 'ER', mode: 'insensitive' as const } },
  ],
}

function getMockPayload(department: Department) {
  if (department === 'Radiology') {
    return {
      result: 'Chest X-Ray auto-simulated. No acute cardiopulmonary findings.',
      attachmentPath: DEMO_RADIOLOGY_XRAY_IMAGE_URL,
    }
  }
  if (department === 'Sonar') {
    return {
      result: 'Sonar auto-simulated. No significant abnormalities detected.',
      attachmentPath: DEMO_SONAR_ULTRASOUND_IMAGE_URL,
    }
  }
  return {
    result: 'HB: 14.2, WBC: 6500',
    attachmentPath: undefined,
  }
}

function parseVisitNotes(notes: string | null): Record<string, unknown> {
  if (!notes) return {}
  try {
    return JSON.parse(notes) as Record<string, unknown>
  } catch {
    return {}
  }
}

/**
 * Sonar simulator: flags the patient for ultrasound (DB + visit order).
 * Does NOT inject sonarResults â€” technician uploads + release-imaging completes the path to the doctor.
 */
async function simulateSonarRequest() {
  const visits = await prisma.visit.findMany({
    where: ER_VISIT_FILTER,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      notes: true,
      status: true,
      patientId: true,
      patient: { select: { firstName: true, lastName: true } },
    },
  })

  if (visits.length === 0) {
    return NextResponse.json({
      success: false,
      message: 'No ER visits found. Create an Emergency visit first, then simulate Sonar.',
    })
  }

  for (const visit of visits) {
    const parsed = parseVisitNotes(visit.notes)
    const erOrders = (parsed.erOrders as Array<{ at?: string; type?: string; content?: string; status?: string }>) || []
    const sonarResults = (parsed.sonarResults as Array<{ at?: string }>) || []

    const unfulfilled = erOrders.find((o) => {
      if (o.type !== 'SONAR_REQUESTED' || !o.at) return false
      return !sonarResults.some((r) => String(r.at) === String(o.at))
    })

    if (unfulfilled) {
      await prisma.patient.update({
        where: { id: visit.patientId },
        data: {
          sonarStatus: 'COMPLETE',
          sonarImage: DEMO_SONAR_ULTRASOUND_IMAGE_URL,
          sonarNotes:
            'Simulated sonar feed (demo). Formal study may still appear in the technician queue until released.',
        },
      })
      const patientName = visit.patient
        ? `${visit.patient.firstName} ${visit.patient.lastName}`.trim()
        : 'Patient'
      return NextResponse.json({
        success: true,
        patientName,
        visitId: visit.id,
        department: 'Sonar' as const,
        message: `Sonar queue: ${patientName} â€” patient sonarImage/sonarStatus updated (COMPLETE, demo).`,
      })
    }
  }

  const target = visits[0]
  const parsed = parseVisitNotes(target.notes)
  const erOrders = (parsed.erOrders as Array<{ at?: string; type?: string; content?: string; status?: string }>) || []
  const at = new Date().toISOString()
  const nextOrders = [
    ...erOrders,
    {
      type: 'SONAR_REQUESTED' as const,
      at,
      content: 'Ultrasound / Sonar',
      status: 'PENDING' as const,
    },
  ]

  await prisma.visit.update({
    where: { id: target.id },
    data: {
      notes: JSON.stringify({
        ...parsed,
        erOrders: nextOrders,
      }),
      updatedAt: new Date(),
    },
  })

  await prisma.patient.update({
    where: { id: target.patientId },
    data: {
      sonarStatus: 'COMPLETE',
      sonarImage: DEMO_SONAR_ULTRASOUND_IMAGE_URL,
      sonarNotes:
        'Simulated sonar feed (demo). Formal study may still appear in the technician queue until released.',
    },
  })

  const patientName = target.patient
    ? `${target.patient.firstName} ${target.patient.lastName}`.trim()
    : 'Patient'

  return NextResponse.json({
    success: true,
    patientName,
    visitId: target.id,
    department: 'Sonar' as const,
    message: `Sonar request created for ${patientName}. Sonar queue will show this study â€” technician uploads image then sends to doctor.`,
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { department?: Department }
    const department = body.department
    if (!department || !['Radiology', 'Sonar', 'Lab'].includes(department)) {
      return NextResponse.json({ error: 'department is required' }, { status: 400 })
    }

    if (department === 'Sonar') {
      return simulateSonarRequest()
    }

    const visits = await prisma.visit.findMany({
      where: ER_VISIT_FILTER,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        notes: true,
        status: true,
        patient: { select: { firstName: true, lastName: true } },
      },
    })

    let selectedVisit:
      | { id: string; notes: string | null; status: VisitStatus; patient: { firstName: string; lastName: string } | null }
      | undefined
    let selectedOrderAt: string | undefined
    let selectedTestType: string | undefined

    for (const visit of visits) {
      const parsed = parseVisitNotes(visit.notes)
      const erOrders = (parsed.erOrders as Array<{ at?: string; type?: string; content?: string }>) || []
      const results = (parsed[RESULT_KEYS[department]] as ResultEntry[]) || []
      const pending = erOrders.find((o) => {
        if (!o.at || !o.type) return false
        if (!ORDER_TYPES[department].includes(o.type)) return false
        const alreadyDone = results.some((r) => String(r.at) === String(o.at))
        return !alreadyDone
      })
      if (pending) {
        selectedVisit = visit
        selectedOrderAt = pending.at
        selectedTestType = pending.content || department
        break
      }
    }

    if (!selectedVisit || !selectedOrderAt) {
      return NextResponse.json({ success: false, message: 'No pending patient found for this device.' })
    }

    const parsed = parseVisitNotes(selectedVisit.notes)
    const completedAt = new Date()
    const completedAtIso = completedAt.toISOString()
    const key = RESULT_KEYS[department]
    const current = (parsed[key] as ResultEntry[]) || []
    const payload = getMockPayload(department)
    current.push({
      at: selectedOrderAt,
      testType: selectedTestType,
      result: payload.result,
      completedAt: completedAtIso,
      attachmentPath: payload.attachmentPath,
    })

    const erOrders = (parsed.erOrders as Array<{ at?: string; type?: string; status?: string; content?: string }>) || []
    const selectedAtStr = String(selectedOrderAt)
    // Sonar is handled above; here department is only Radiology | Lab.
    const isImaging = department === 'Radiology'
    const updatedErOrders = isImaging
      ? erOrders
      : erOrders.map((o) => (String(o.at) === selectedAtStr ? { ...o, status: 'COMPLETED' as const } : o))
    const lastResultAt = (parsed.lastResultAt as Record<string, string>) || {}
    if (!isImaging) {
      lastResultAt[department] = completedAtIso
    }
    parsed.lastResultAt = lastResultAt

    const wasOutForTest = selectedVisit.status === VisitStatus.OUT_FOR_TEST
    await prisma.visit.update({
      where: { id: selectedVisit.id },
      data: {
        notes: JSON.stringify({
          ...parsed,
          erOrders: updatedErOrders,
          lastResultAt,
          [key]: current,
        }),
        ...(!isImaging && wasOutForTest && { status: VisitStatus.COMPLETED }),
        updatedAt: new Date(),
      },
    })

    const patientName = selectedVisit.patient
      ? `${selectedVisit.patient.firstName} ${selectedVisit.patient.lastName}`.trim()
      : 'Patient'
    return NextResponse.json({
      success: true,
      patientName,
      visitId: selectedVisit.id,
      department,
      message: 'Data sent from Device to ZION Server successfully!',
    })
  } catch (e: unknown) {
    const err = e as Error
    return NextResponse.json({ error: err?.message || 'Simulation failed' }, { status: 500 })
  }
}

```

# FILE: src/app/api/diagnostic/auto-ingest/route.ts

```
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'
import path from 'path'
import { mkdir, readdir, readFile, rename, copyFile, unlink } from 'fs/promises'

type Department = 'Lab' | 'Radiology' | 'Sonar'

type ResultEntry = {
  at?: string
  testType?: string
  result: string
  completedAt?: string
  attachmentPath?: string
}

const ORDER_TYPES: Record<Department, string[]> = {
  Lab: ['LAB', 'LAB_REQUESTED'],
  Radiology: ['RADIOLOGY_REQUESTED'],
  Sonar: ['SONAR_REQUESTED'],
}

const RESULTS_KEYS: Record<Department, string> = {
  Lab: 'labResults',
  Radiology: 'radiologyResults',
  Sonar: 'sonarResults',
}

const FOLDER_KEYS: Record<Department, string> = {
  Lab: 'lab',
  Radiology: 'radiology',
  Sonar: 'sonar',
}

function parseLabResult(raw: string) {
  const hb = /HB\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i.exec(raw)?.[1]
  const wbc = /WBC\s*[:=]\s*([0-9]+(?:\.[0-9]+)?)/i.exec(raw)?.[1]
  if (hb || wbc) {
    return `Blood Test: Hemoglobin ${hb || 'N/A'}, WBC ${wbc || 'N/A'}`
  }
  return 'Blood Test: Hemoglobin 14.5, WBC 7000'
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { department?: Department }
    const department = body.department
    if (!department || !['Lab', 'Radiology', 'Sonar'].includes(department)) {
      return NextResponse.json({ error: 'department must be Lab, Radiology, or Sonar' }, { status: 400 })
    }

    const folderKey = FOLDER_KEYS[department]
    const hotFolder = path.join(process.cwd(), 'hot-folder', folderKey)
    const processedFolder = path.join(hotFolder, 'processed')
    await mkdir(hotFolder, { recursive: true })
    await mkdir(processedFolder, { recursive: true })

    const names = await readdir(hotFolder, { withFileTypes: true })
    const files = names
      .filter((d) => d.isFile())
      .map((d) => d.name)
      .filter((n) => !n.endsWith('.processed'))

    if (files.length === 0) {
      return NextResponse.json({ ingested: false, listening: true, message: 'No files in hot folder.' })
    }

    const visits = await prisma.visit.findMany({
      where: {
        status: { not: VisitStatus.Discharged },
        OR: [
          { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' } },
          { chiefComplaint: { contains: 'ER', mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, notes: true, status: true },
    })

    let targetVisitId: string | null = null
    let targetAt: string | undefined
    let targetTestType: string | undefined

    for (const v of visits) {
      let parsed: Record<string, unknown> = {}
      try {
        if (v.notes) parsed = JSON.parse(v.notes) as Record<string, unknown>
      } catch (_) {}
      const erOrders = (parsed.erOrders as Array<{ at?: string; type?: string; content?: string; status?: string }>) || []
      const existing = (parsed[RESULTS_KEYS[department]] as ResultEntry[]) || []
      const pending = erOrders.find((o) => {
        if (!o.at || !o.type) return false
        if (!ORDER_TYPES[department].includes(o.type)) return false
        const done = existing.some((r) => r.at === o.at)
        return !done
      })
      if (pending) {
        targetVisitId = v.id
        targetAt = pending.at
        targetTestType = pending.content || (department === 'Lab' ? 'Blood Test' : department === 'Radiology' ? 'X-Ray' : 'Sonar')
        break
      }
    }

    if (!targetVisitId || !targetAt) {
      return NextResponse.json({ ingested: false, listening: true, message: 'No pending patient request found.' })
    }

    const sourceFile = files.sort()[0]
    const sourcePath = path.join(hotFolder, sourceFile)
    const ext = path.extname(sourceFile).toLowerCase()
    const now = new Date().toISOString()
    let resultText = ''
    let attachmentPath: string | undefined

    if (department === 'Lab') {
      if (ext === '.txt' || ext === '.csv' || ext === '.json') {
        const raw = await readFile(sourcePath, 'utf8')
        resultText = parseLabResult(raw)
      } else {
        resultText = 'Blood Test: Hemoglobin 14.5, WBC 7000'
      }
    } else {
      const targetDir = path.join(process.cwd(), 'public', 'uploads', 'diagnostics', 'auto')
      await mkdir(targetDir, { recursive: true })
      const targetName = `${targetVisitId}-${Date.now()}${ext || '.jpg'}`
      const targetPath = path.join(targetDir, targetName)
      await copyFile(sourcePath, targetPath)
      attachmentPath = `/uploads/diagnostics/auto/${targetName}`
      resultText = `Auto-imported ${department === 'Radiology' ? 'X-Ray' : 'Sonar'} image result.`
    }

    const visit = await prisma.visit.findUnique({
      where: { id: targetVisitId },
      select: { id: true, notes: true, status: true },
    })
    if (!visit) {
      return NextResponse.json({ ingested: false, listening: true, message: 'Visit not found.' })
    }

    let parsed: Record<string, unknown> = {}
    try {
      if (visit.notes) parsed = JSON.parse(visit.notes) as Record<string, unknown>
    } catch (_) {}

    const key = RESULTS_KEYS[department]
    const existing = (parsed[key] as ResultEntry[]) || []
    existing.push({
      at: targetAt,
      testType: targetTestType,
      result: resultText,
      completedAt: now,
      attachmentPath,
    })

    const isImaging = department === 'Radiology' || department === 'Sonar'
    const erOrders = (parsed.erOrders as Array<{ at?: string; type?: string; status?: string }>) || []
    parsed.erOrders = isImaging ? erOrders : erOrders.map((o) => (o.at === targetAt ? { ...o, status: 'COMPLETED' } : o))
    const lastResultAt = (parsed.lastResultAt as Record<string, string>) || {}
    if (!isImaging) {
      lastResultAt[department] = now
    }
    parsed.lastResultAt = lastResultAt

    const wasOutForTest = visit.status === VisitStatus.OUT_FOR_TEST
    await prisma.visit.update({
      where: { id: targetVisitId },
      data: {
        notes: JSON.stringify({ ...parsed, [key]: existing }),
        ...(!isImaging && wasOutForTest && { status: VisitStatus.COMPLETED }),
        updatedAt: new Date(),
      },
    })

    await rename(sourcePath, path.join(processedFolder, `${Date.now()}-${sourceFile}.processed`)).catch(async () => {
      await unlink(sourcePath).catch(() => {})
    })

    return NextResponse.json({
      ingested: true,
      listening: true,
      visitId: targetVisitId,
      department,
      result: resultText,
      attachmentPath,
    })
  } catch (e: unknown) {
    const err = e as Error
    return NextResponse.json({ error: err?.message || 'Auto ingest failed' }, { status: 500 })
  }
}

```

# FILE: src/app/api/lab/er-beds/route.ts

```
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

const TOTAL_BEDS = 12

type DiagnosticDepartment = 'Lab' | 'Radiology' | 'Sonar'

interface LabRequest {
  at: string
  testType: string
  status: 'Pending' | 'Completed'
  result?: string
  completedAt?: string
  attachmentPath?: string
  technicianNotes?: string
}

const DEPARTMENT_ORDER_TYPES: Record<DiagnosticDepartment, string[]> = {
  Lab: ['LAB', 'LAB_REQUESTED'],
  Radiology: ['RADIOLOGY_REQUESTED'],
  Sonar: ['SONAR_REQUESTED'],
}
const DEPARTMENT_RESULTS_KEY: Record<DiagnosticDepartment, string> = {
  Lab: 'labResults',
  Radiology: 'radiologyResults',
  Sonar: 'sonarResults',
}

// GET /api/lab/er-beds?department=Lab|Radiology|Sonar - ER beds with request status for that department
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const department = (searchParams.get('department') || 'Lab') as DiagnosticDepartment
    const orderTypes = DEPARTMENT_ORDER_TYPES[department] ?? DEPARTMENT_ORDER_TYPES.Lab
    const resultsKey = DEPARTMENT_RESULTS_KEY[department] ?? 'labResults'
    const visits = await prisma.visit.findMany({
      where: {
        status: { not: VisitStatus.Discharged },
        OR: [
          { chiefComplaint: { contains: 'Emergency', mode: 'insensitive' } },
          { chiefComplaint: { contains: 'ER', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        patientId: true,
        notes: true,
        status: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            triageLevel: true,
            dateOfBirth: true,
          },
        },
      },
    })

    const bedMap = new Map<
      number,
      {
        bedNumber: number
        visitId: string
        patientId: string
        patientName: string
        patientAge: number | null
        triageLevel: number | null
        visitStatus: string
        labRequests: LabRequest[]
      }
    >()

    // Some dev DBs may be out of sync (missing `bedNumber` column).
    // If bedNumber is absent, we assign sequential bed slots for UI rendering.
    let nextBedNumber = 1

    for (const v of visits) {
      let bedNum = (v as { bedNumber?: number | null }).bedNumber
      if (bedNum == null) {
        if (nextBedNumber > TOTAL_BEDS) continue
        bedNum = nextBedNumber++
      }
      const patientName = `${v.patient?.firstName ?? ''} ${v.patient?.lastName ?? ''}`.trim()
      const labRequests: LabRequest[] = []
      let resultsList: Array<{
        at?: string
        testType?: string
        result: string
        completedAt?: string
        attachmentPath?: string
        releasedToDoctorAt?: string
        technicianNotes?: string
      }> = []
      try {
        if (v.notes) {
          const parsed = JSON.parse(v.notes) as Record<string, unknown>
          const erOrders = (parsed.erOrders as Array<{ type: string; content?: string; at: string; status?: string }>) || []
          resultsList = (parsed[resultsKey] as typeof resultsList) || []
          for (const order of erOrders) {
            if (!orderTypes.includes(order.type)) continue
            const contentLower = (order.content || '').toLowerCase()
            const looksRadiology = /\b(x-?ray|ct\b|mri|ultrasound|radiology)\b/.test(contentLower)
            const looksLab = /\b(cbc|glucose|creatinine|hb|wbc|rbc|blood\s*type|lab\b)\b/.test(contentLower)
            if (department === 'Lab' && looksRadiology) continue
            if (department === 'Radiology' && looksLab) continue
            const testType = order.content || (department === 'Lab' ? 'Lab' : department === 'Radiology' ? 'X-Ray' : 'Sonar')
            const byOrderAt = resultsList.find((r) => String(r.at) === String(order.at))
            const fuzzyMatch = resultsList.find(
              (r) =>
                r.testType &&
                testType &&
                (r.testType.includes(testType) || testType.includes(r.testType))
            )
            const resultRow = byOrderAt ?? fuzzyMatch
            const orderMarkedDone = String(order.status || '').toUpperCase() === 'COMPLETED'
            const isImagingDept = department === 'Radiology' || department === 'Sonar'
            const done = isImagingDept ? orderMarkedDone : Boolean(resultRow) || orderMarkedDone
            const displayRow =
              resultRow ?? (orderMarkedDone ? resultsList.find((r) => String(r.at) === String(order.at)) : undefined)
            const rawPath = displayRow?.attachmentPath
            const attachmentPath =
              typeof rawPath === 'string' && rawPath.trim() ? rawPath.trim() : undefined
            labRequests.push({
              at: order.at,
              testType,
              status: done ? 'Completed' : 'Pending',
              result: displayRow?.result,
              completedAt: displayRow?.completedAt,
              attachmentPath,
              technicianNotes:
                typeof displayRow?.technicianNotes === 'string' ? displayRow.technicianNotes : undefined,
            })
          }
        }
      } catch (_) {}
      const triageLevel = v.patient?.triageLevel ?? null
      const patientAge =
        v.patient?.dateOfBirth instanceof Date
          ? Math.max(0, new Date().getFullYear() - v.patient.dateOfBirth.getFullYear())
          : null
      const visitStatus = (v as { status?: string }).status ?? ''
      bedMap.set(bedNum, {
        bedNumber: bedNum,
        visitId: v.id,
        patientId: v.patientId,
        patientName: patientName || 'Patient info missing',
        patientAge,
        triageLevel,
        visitStatus,
        labRequests,
      })
    }

    const beds: Array<{
      bedNumber: number
      visitId: string | null
      patientId: string | null
      patientName: string | null
      patientAge?: number | null
      triageLevel?: number | null
      visitStatus?: string
      labRequests: LabRequest[]
    }> = []
    for (let n = 1; n <= TOTAL_BEDS; n++) {
      const row = bedMap.get(n)
      if (row) {
        beds.push(row)
      } else {
        beds.push({
          bedNumber: n,
          visitId: null,
          patientId: null,
          patientName: null,
          patientAge: null,
          triageLevel: null,
          visitStatus: '',
          labRequests: [],
        })
      }
    }

    return NextResponse.json(beds)
  } catch (e) {
    console.error('Error fetching ER lab beds:', e)
    // Lab/Radiology/Sonar dashboards: return empty bed list instead of 500
    return NextResponse.json([])
  }
}

```

# FILE: src/app/api/lab/er-beds/result/route.ts

```
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VisitStatus } from '@prisma/client'

type DiagnosticDepartment = 'Lab' | 'Radiology' | 'Sonar'
const RESULTS_KEYS: Record<DiagnosticDepartment, string> = {
  Lab: 'labResults',
  Radiology: 'radiologyResults',
  Sonar: 'sonarResults',
}

interface ResultEntry {
  at?: string
  testType?: string
  result: string
  completedAt?: string
  attachmentPath?: string
  technicianNotes?: string
}

// POST /api/lab/er-beds/result - Save diagnostic result (Lab / Radiology / Sonar) with optional file
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { visitId, at, testType, result, department, attachmentPath, technicianNotes } = body
    if (!visitId || (result !== undefined && typeof result !== 'string')) {
      return NextResponse.json({ error: 'visitId required; result must be string if provided' }, { status: 400 })
    }
    const resultText = typeof result === 'string' ? result.trim() : ''
    if (!resultText && !attachmentPath) {
      return NextResponse.json({ error: 'Provide at least result text or attachment' }, { status: 400 })
    }
    const dept: DiagnosticDepartment = department === 'Radiology' || department === 'Sonar' ? department : 'Lab'
    const visit = await prisma.visit.findUnique({
      where: { id: visitId },
      select: { id: true, notes: true, status: true },
    })
    if (!visit) return NextResponse.json({ error: 'Visit not found' }, { status: 404 })

    let parsed: Record<string, unknown> = {}
    try {
      if (visit.notes) parsed = JSON.parse(visit.notes) as Record<string, unknown>
    } catch (_) {}
    const key = RESULTS_KEYS[dept]
    const existing = (parsed[key] as ResultEntry[]) || []
    const completedAt = new Date().toISOString()
    const isImaging = dept === 'Radiology' || dept === 'Sonar'
    existing.push({
      at: at || undefined,
      testType: testType || undefined,
      result: resultText || '(See attachment)',
      completedAt,
      attachmentPath: attachmentPath || undefined,
      technicianNotes:
        typeof technicianNotes === 'string' && technicianNotes.trim()
          ? technicianNotes.trim()
          : undefined,
    })

    const erOrders = (parsed.erOrders as Array<{ at?: string; type?: string; status?: string }>) || []
    const updatedErOrders = isImaging
      ? erOrders
      : erOrders.map((order) => (String(order.at) === String(at) ? { ...order, status: 'COMPLETED' } : order))
    parsed.erOrders = updatedErOrders

    const lastResultAt = (parsed.lastResultAt as Record<string, string>) || {}
    if (!isImaging) {
      lastResultAt[dept] = completedAt
    }
    parsed.lastResultAt = lastResultAt

    const wasOutForTest = visit.status === VisitStatus.OUT_FOR_TEST
    await prisma.visit.update({
      where: { id: visitId },
      data: {
        notes: JSON.stringify({ ...parsed, [key]: existing }),
        ...(!isImaging && wasOutForTest && { status: VisitStatus.COMPLETED }),
        updatedAt: new Date(),
      },
    })
    return NextResponse.json({ success: true, completedAt, statusUpdatedToReadyForReview: wasOutForTest })
  } catch (e: unknown) {
    const err = e as Error
    console.error('Error saving lab result:', err)
    return NextResponse.json({ error: err?.message || 'Failed' }, { status: 500 })
  }
}

```

# FILE: src/app/radiology/page.tsx

```
'use client'
// FINAL STABLE VERSION - DO NOT MODIFY WITHOUT EXPLICIT PERMISSION FROM HAWRAA.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import SmartSidebar from '@/components/shared/SmartSidebar'
import BackButton from '@/components/BackButton'
import { USER_ROLES } from '@/contexts/AuthContext'
import {
  DEMO_RADIOLOGY_XRAY_IMAGE_URL,
  DEMO_SONAR_ULTRASOUND_IMAGE_URL,
  normalizeExternalImageUrl,
} from '@/config/demoDiagnosticImageUrls'
import { Image, Printer, X } from 'lucide-react'
// MANDATORY SAFETY CHECK: CONFIRMATION MODAL.

type ImagingTab = 'X-Ray' | 'Ultrasound/Sonar'
type ImagingStatus = 'Pending' | 'Completed'

type ImagingRequest = {
  id: string
  tab: ImagingTab
  department: 'Radiology' | 'Sonar'
  visitId: string
  patientId: string
  patientName: string
  requestType: string
  status: ImagingStatus
  at: string
  uploadedImage?: string
  /** Auto / device report text (stored before doctor release) */
  notes: string
  /** Saved when technician sends to doctor */
  technicianNotes?: string
  requestedAt: string
}

type LabRequest = {
  at: string
  testType: string
  status: ImagingStatus
  result?: string
  completedAt?: string
  attachmentPath?: string
  technicianNotes?: string
}

type BedRow = {
  visitId: string | null
  patientId: string | null
  patientName: string | null
  labRequests: LabRequest[]
}

const buildImagingRequests = (
  beds: BedRow[],
  tab: ImagingTab,
  department: 'Radiology' | 'Sonar'
): ImagingRequest[] =>
  beds.flatMap((bed) =>
    (bed.labRequests || []).map((req) => ({
      id: `${department}-${bed.visitId || 'unknown'}-${req.at}`,
      tab,
      department,
      visitId: bed.visitId || '',
      patientId: bed.patientId || '',
      patientName: bed.patientName || 'Unknown',
      requestType: req.testType || (tab === 'X-Ray' ? 'X-Ray' : 'Ultrasound'),
      status: req.status || 'Pending',
      at: req.at,
      uploadedImage: normalizeExternalImageUrl(req.attachmentPath),
      notes: req.result || '',
      technicianNotes: req.technicianNotes,
      requestedAt: new Date(req.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }))
  )

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new Error('Could not read file'))
    r.readAsDataURL(file)
  })
}

export default function RadiologyDashboard() {
  const [activeTab, setActiveTab] = useState<ImagingTab>('X-Ray')
  const [requests, setRequests] = useState<ImagingRequest[]>([])
  const [expandedImageFor, setExpandedImageFor] = useState<ImagingRequest | null>(null)
  const [reviewFor, setReviewFor] = useState<ImagingRequest | null>(null)
  const [reviewTechNotes, setReviewTechNotes] = useState('')
  const [reviewBusy, setReviewBusy] = useState(false)
  const [confirmSendFor, setConfirmSendFor] = useState<ImagingRequest | null>(null)
  const [confirmSendBusy, setConfirmSendBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(true)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleRequests = useMemo(() => {
    const byType = requests.filter((item) =>
      activeTab === 'X-Ray' ? item.tab === 'X-Ray' : item.tab === 'Ultrasound/Sonar'
    )
    return [...byType].sort((a, b) => {
      if (a.status === b.status) return 0
      return a.status === 'Pending' ? -1 : 1
    })
  }, [requests, activeTab])

  const fetchRequests = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError(null)
      const [radiologyRes, sonarRes] = await Promise.all([
        fetch('/api/lab/er-beds?department=Radiology'),
        fetch('/api/lab/er-beds?department=Sonar'),
      ])
      const radiologyBeds = (await radiologyRes.json().catch(() => [])) as BedRow[]
      const sonarBeds = (await sonarRes.json().catch(() => [])) as BedRow[]
      const merged = [
        ...buildImagingRequests(Array.isArray(radiologyBeds) ? radiologyBeds : [], 'X-Ray', 'Radiology'),
        ...buildImagingRequests(Array.isArray(sonarBeds) ? sonarBeds : [], 'Ultrasound/Sonar', 'Sonar'),
      ]
      setRequests(merged)
    } catch (_) {
      setError('Failed to load imaging queue.')
      setRequests([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = (new URLSearchParams(window.location.search).get('tab') || '').toLowerCase()
    if (t === 'sonar' || t === 'ultrasound') {
      setActiveTab('Ultrasound/Sonar')
    }
  }, [])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  // Silent refresh so simulator DB updates appear without flicker.
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRequests(true)
    }, 2000)
    return () => clearInterval(interval)
  }, [fetchRequests])

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return
    const bc = new BroadcastChannel('zion-diagnostic')
    bc.onmessage = (ev: MessageEvent) => {
      const d = ev.data as { type?: string; department?: string }
      if (d?.type === 'simulate-success' && (d.department === 'Radiology' || d.department === 'Sonar')) {
        fetchRequests(true)
      }
    }
    return () => bc.close()
  }, [fetchRequests])

  useEffect(() => {
    const pollAutoIngest = async () => {
      try {
        const [radRes, sonarRes] = await Promise.all([
          fetch('/api/diagnostic/auto-ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ department: 'Radiology' }),
          }),
          fetch('/api/diagnostic/auto-ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ department: 'Sonar' }),
          }),
        ])
        const rad = (await radRes.json().catch(() => ({}))) as { ingested?: boolean }
        const sonar = (await sonarRes.json().catch(() => ({}))) as { ingested?: boolean }
        if (rad.ingested || sonar.ingested) {
          showSuccessToast()
          await fetchRequests(true)
        }
        setIsListening(true)
      } catch (_) {
        setIsListening(false)
      }
    }
    pollAutoIngest()
    const interval = setInterval(pollAutoIngest, 5000)
    return () => clearInterval(interval)
  }, [fetchRequests])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  const showSuccessToast = (message = 'Result sent to doctor successfully!') => {
    setToast(message)
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 2200)
  }

  const simulateAutoImport = async () => {
    const firstPending = requests.find((r) => r.status === 'Pending')
    if (!firstPending) {
      setToast('No pending imaging requests.')
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
      toastTimerRef.current = setTimeout(() => setToast(null), 1800)
      return
    }
    const demoImage =
      firstPending.tab === 'X-Ray' ? DEMO_RADIOLOGY_XRAY_IMAGE_URL : DEMO_SONAR_ULTRASOUND_IMAGE_URL

    try {
      const resultRes = await fetch('/api/lab/er-beds/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: firstPending.visitId,
          at: firstPending.at,
          testType: firstPending.requestType,
          result: `Auto-imported ${firstPending.tab} result.`,
          department: firstPending.department,
          attachmentPath: demoImage,
        }),
      })
      const resultJson = (await resultRes.json().catch(() => ({}))) as { error?: string }
      if (!resultRes.ok) throw new Error(resultJson.error || 'Auto-import failed')

      await fetchRequests(true)
      showSuccessToast('Image captured â€” open Review & Submit to send to the doctor.')
    } catch (err) {
      setError((err as Error)?.message || 'Auto-import failed')
    }
  }

  const handleUploadResult = async (row: ImagingRequest, file?: File | null) => {
    try {
      let attachmentPath: string | undefined
      if (file) {
        attachmentPath = await readFileAsDataUrl(file)
      } else {
        attachmentPath =
          row.tab === 'X-Ray' ? DEMO_RADIOLOGY_XRAY_IMAGE_URL : DEMO_SONAR_ULTRASOUND_IMAGE_URL
      }
      const resultRes = await fetch('/api/lab/er-beds/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: row.visitId,
          at: row.at,
          testType: row.requestType,
          result: row.notes || 'Imaging study uploaded.',
          department: row.department,
          attachmentPath,
        }),
      })
      const resultJson = (await resultRes.json().catch(() => ({}))) as { error?: string }
      if (!resultRes.ok) {
        throw new Error(resultJson.error || 'Failed to complete result')
      }
      await fetchRequests(true)
      showSuccessToast('Image saved â€” review and send to the doctor when ready.')
    } catch (err) {
      setError((err as Error)?.message || 'Failed to upload result')
    }
  }

  const openReviewModal = (row: ImagingRequest) => {
    setReviewFor(row)
    setReviewTechNotes(row.technicianNotes || '')
  }

  const submitReviewToDoctor = async (row: ImagingRequest, techNotes: string) => {
    if (!row?.uploadedImage) return
    setReviewBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/lab/er-beds/release-imaging', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitId: row.visitId,
          at: row.at,
          department: row.department,
          technicianNotes: techNotes.trim(),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Failed to send to doctor')
      setReviewFor(null)
      setReviewTechNotes('')
      showSuccessToast()
      await fetchRequests(true)
      if (typeof BroadcastChannel !== 'undefined') {
        new BroadcastChannel('zion-diagnostic').postMessage({
          type: 'imaging-released',
          department: row.department,
        })
      }
    } catch (e) {
      setError((e as Error)?.message || 'Failed to send to doctor')
    } finally {
      setReviewBusy(false)
    }
  }

  // MANDATORY SAFETY CHECK: CONFIRMATION MODAL.
  const requestSendConfirmation = () => {
    if (!reviewFor?.uploadedImage) return
    setConfirmSendFor(reviewFor)
  }

  const confirmSendToDoctor = async () => {
    if (!confirmSendFor) return
    setConfirmSendBusy(true)
    try {
      await submitReviewToDoctor(confirmSendFor, reviewTechNotes)
      setConfirmSendFor(null)
    } finally {
      setConfirmSendBusy(false)
    }
  }

  const escapeHtmlAttr = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const escapeHtmlText = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const handlePrint = (request: ImagingRequest) => {
    const printWindow = window.open('', '_blank', 'width=1024,height=900')
    if (!printWindow) return

    const imgBlock =
      request.uploadedImage &&
      `<img src="${escapeHtmlAttr(request.uploadedImage)}" referrerpolicy="no-referrer" alt="Scan image" />`

    const html = `
      <!doctype html>
      <html>
      <head>
        <title>ZION Imaging Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px; }
          .hospital { font-size: 22px; font-weight: 700; }
          .sub { color: #334155; margin-top: 4px; }
          .meta { margin: 14px 0; line-height: 1.7; }
          img { max-width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; margin: 14px 0; }
          .label { font-weight: 700; }
          .notes { margin-top: 10px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hospital">ZION Hospital</div>
          <div class="sub">Diagnostic Imaging Report</div>
        </div>
        <div class="meta">
          <div><span class="label">Patient Name:</span> ${request.patientName}</div>
          <div><span class="label">Patient ID:</span> ${request.patientId}</div>
          <div><span class="label">Visit ID:</span> ${request.visitId}</div>
          <div><span class="label">Exam:</span> ${request.requestType}</div>
        </div>
        ${imgBlock || ''}
        <div class="notes">
          <div class="label">Study summary</div>
          <div>${escapeHtmlText(request.notes)}</div>
        </div>
        ${
          request.technicianNotes
            ? `<div class="notes" style="margin-top:12px"><div class="label">Technician notes (to doctor)</div><div>${escapeHtmlText(request.technicianNotes)}</div></div>`
            : ''
        }
        <script>
          window.onload = () => {
            window.print();
            window.onafterprint = () => window.close();
          };
        </script>
      </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.RADIOLOGY_TECH, USER_ROLES.ADMIN]}>
      <div className="flex h-screen bg-[#0B1120] overflow-hidden">
        <SmartSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-6xl mx-auto space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-semibold text-slate-100">ZION Hospital - Diagnostic Imaging</h1>
                  <p className="text-xs text-slate-400">Radiology and Ultrasound queue</p>
                  <p className={`text-xs mt-1 ${isListening ? 'text-emerald-400' : 'text-amber-400'}`}>
                    Status: Listening for devices...
                  </p>
                </div>
                <button
                  type="button"
                  onClick={simulateAutoImport}
                  className="opacity-0 pointer-events-auto h-0 w-0 overflow-hidden"
                  aria-label="Auto Process"
                >
                  Auto-Process
                </button>
              </div>
              <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-2 inline-flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('X-Ray')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === 'X-Ray'
                      ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300'
                      : 'text-slate-300 hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  X-Ray
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('Ultrasound/Sonar')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    activeTab === 'Ultrasound/Sonar'
                      ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300'
                      : 'text-slate-300 hover:bg-slate-800/70 border border-transparent'
                  }`}
                >
                  Ultrasound/Sonar
                </button>
              </div>

              <section className="rounded-xl border border-slate-800/60 bg-slate-900/40 p-3">
                <h2 className="text-sm font-semibold text-slate-300 mb-3">
                  {activeTab} Requests
                </h2>
                {error && (
                  <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                    {error}
                  </div>
                )}
                <div className="overflow-x-auto rounded-lg border border-slate-800/40">
                  <table className="w-full min-w-[760px] table-fixed text-sm">
                    <thead>
                      <tr className="text-left text-slate-400 border-b border-slate-700/70 bg-slate-900/60">
                        <th className="py-3 px-4 font-medium w-[26%]">Patient Name</th>
                        <th className="py-3 px-4 font-medium w-[20%]">Type</th>
                        <th className="py-3 px-4 font-medium w-[11%]">Time</th>
                        <th className="py-3 px-4 font-medium w-[12%]">Status</th>
                        <th className="py-3 px-4 font-medium w-[132px]">Image</th>
                        <th className="py-3 px-4 font-medium text-right w-[28%] min-w-[220px]">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-500">
                            Loading imaging queue...
                          </td>
                        </tr>
                      )}
                      {!loading && visibleRequests.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-500">
                            No imaging requests in this tab.
                          </td>
                        </tr>
                      )}
                      {visibleRequests.map((item) => {
                        return (
                          <tr
                            key={item.id}
                            className="border-b border-slate-800/70 align-middle transition-colors hover:bg-slate-800/20"
                          >
                            <td className="py-3 px-4">
                              <div className="text-slate-100 font-medium leading-5 truncate" title={item.patientName}>
                                {item.patientName}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate" title={item.visitId}>
                                {item.visitId}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-300">
                              <span className="line-clamp-2" title={item.requestType}>
                                {item.requestType}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-300 whitespace-nowrap tabular-nums">
                              {item.requestedAt}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex text-xs px-2.5 py-1 rounded-md font-medium ${
                                  item.status === 'Completed'
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-amber-500/20 text-amber-300'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 w-[132px]">
                              {item.uploadedImage ? (
                                <button
                                  type="button"
                                  onClick={() => setExpandedImageFor(item)}
                                  className="block rounded-md border border-slate-700/90 overflow-hidden bg-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
                                  title="View full size"
                                >
                                  <img
                                    src={item.uploadedImage}
                                    alt=""
                                    referrerPolicy="no-referrer"
                                    className="h-14 w-[5.5rem] object-cover block"
                                  />
                                </button>
                              ) : (
                                <div
                                  role="img"
                                  aria-label="No image"
                                  className="flex h-14 w-[5.5rem] items-center justify-center rounded-md border border-slate-700/60 bg-slate-800/40"
                                >
                                  <Image className="h-6 w-6 text-slate-600 shrink-0" strokeWidth={1.25} aria-hidden />
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-2 flex-wrap">
                                {item.status === 'Pending' && item.uploadedImage && (
                                  <button
                                    type="button"
                                    onClick={() => openReviewModal(item)}
                                    className="px-2.5 py-1.5 rounded-md bg-sky-500/25 border border-sky-500/45 text-sky-200 text-xs font-medium hover:bg-sky-500/35"
                                  >
                                    Review &amp; Submit
                                  </button>
                                )}
                                {item.status === 'Pending' && !item.uploadedImage && (
                                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                                    <label className="px-2.5 py-1.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30 cursor-pointer inline-block">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="sr-only"
                                        onChange={(e) => {
                                          const f = e.target.files?.[0]
                                          e.target.value = ''
                                          if (f) void handleUploadResult(item, f)
                                        }}
                                      />
                                      Upload image
                                    </label>
                                    <button
                                      type="button"
                                      onClick={() => void handleUploadResult(item, null)}
                                      className="px-2 py-1.5 rounded-md bg-slate-700/80 border border-slate-600 text-slate-300 text-xs font-medium hover:bg-slate-600/80"
                                      title="Attach demo image for testing"
                                    >
                                      Demo image
                                    </button>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handlePrint(item)}
                                  className="px-2.5 py-1.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-medium hover:bg-cyan-500/30 inline-flex items-center gap-1.5"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                  Print
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>
      {reviewFor && (
        <>
          <div
            className="fixed inset-0 z-[90] bg-black/75"
            aria-hidden
            onClick={() => {
              if (!reviewBusy) {
                setReviewFor(null)
                setReviewTechNotes('')
              }
            }}
          />
          <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 pointer-events-none">
            <div
              className="pointer-events-auto max-w-2xl w-full rounded-xl border border-slate-600 bg-slate-900 shadow-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-100">Review imaging</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {reviewFor.patientName} Â· {reviewFor.requestType}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={reviewBusy}
                  onClick={() => {
                    setReviewFor(null)
                    setReviewTechNotes('')
                    setConfirmSendFor(null)
                  }}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-50"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {reviewFor.uploadedImage ? (
                <img
                  src={reviewFor.uploadedImage}
                  alt={`${reviewFor.requestType} preview`}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-[min(50vh,480px)] object-contain rounded-lg border border-slate-700 bg-slate-950"
                />
              ) : null}
              <div>
                <p className="text-xs text-slate-500 mb-1">Study summary (from device)</p>
                <p className="text-sm text-slate-300 rounded-lg bg-slate-800/80 border border-slate-700 p-3 whitespace-pre-wrap">
                  {reviewFor.notes || 'â€”'}
                </p>
              </div>
              <div>
                <label htmlFor="review-tech-notes" className="block text-sm font-medium text-slate-300 mb-1">
                  Technician notes
                </label>
                <textarea
                  id="review-tech-notes"
                  value={reviewTechNotes}
                  onChange={(e) => setReviewTechNotes(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg bg-slate-800 border border-slate-600 px-3 py-2 text-slate-100 text-sm placeholder:text-slate-500"
                  placeholder="Notes visible to the doctor after you sendâ€¦"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={reviewBusy}
                  onClick={() => {
                    setReviewFor(null)
                    setReviewTechNotes('')
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={reviewBusy}
                  onClick={requestSendConfirmation}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium disabled:opacity-50"
                >
                  {reviewBusy ? 'Sendingâ€¦' : 'Send to Doctor'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      {toast && (
        <div className="fixed top-4 right-4 z-[80] rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-3 py-2 text-xs text-emerald-200 shadow-lg">
          {toast}
        </div>
      )}
      {confirmSendFor && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-emerald-500/35 bg-slate-900/95 p-5 shadow-[0_0_24px_rgba(16,185,129,0.25)]">
            <h3 className="text-base font-semibold text-slate-100">
              Confirm Final Results - {confirmSendFor.department === 'Sonar' ? 'Sonar' : 'Radiology'}
            </h3>
            <p className="mt-2 text-sm text-slate-300">
              Are you sure you want to finalize these results for <span className="font-semibold">{confirmSendFor.patientName}</span>? This will send the data directly to the doctor's dashboard.
            </p>
            <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-950/40 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Result Summary</p>
              <div className="overflow-hidden rounded-lg border border-slate-700/60">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-slate-700/60">
                      <td className="px-3 py-2 text-slate-400">Patient</td>
                      <td className="px-3 py-2 text-slate-100">{confirmSendFor.patientName}</td>
                    </tr>
                    <tr className="border-b border-slate-700/60">
                      <td className="px-3 py-2 text-slate-400">Exam Type</td>
                      <td className="px-3 py-2 text-slate-100">{confirmSendFor.requestType}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-slate-400">Result Summary</td>
                      <td className="px-3 py-2 text-slate-100">{confirmSendFor.notes || '(Image attached)'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="confirm-tech-notes" className="mb-1 block text-sm font-medium text-slate-300">
                Technician Notes / Observations
              </label>
              <textarea
                id="confirm-tech-notes"
                value={reviewTechNotes}
                onChange={(e) => setReviewTechNotes(e.target.value)}
                rows={5}
                className="w-full rounded-lg border border-slate-700/60 bg-slate-950/50 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-400/50 focus:outline-none"
                placeholder="Add any notes or clinical observations here (optional)..."
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={confirmSendBusy || reviewBusy}
                onClick={() => setConfirmSendFor(null)}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel / Edit
              </button>
              <button
                type="button"
                disabled={confirmSendBusy || reviewBusy}
                onClick={() => void confirmSendToDoctor()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 hover:shadow-[0_0_16px_rgba(16,185,129,0.45)] disabled:opacity-50"
              >
                {confirmSendBusy || reviewBusy ? 'Sendingâ€¦' : 'Confirm & Send'}
              </button>
            </div>
          </div>
        </div>
      )}
      {expandedImageFor && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70"
            onClick={() => setExpandedImageFor(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative max-w-4xl w-full rounded-xl border border-slate-700 bg-slate-900 p-3">
              <button
                type="button"
                onClick={() => setExpandedImageFor(null)}
                className="absolute right-3 top-3 p-1.5 rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-sm text-slate-300 mb-2 pr-10">
                {expandedImageFor.patientName} - {expandedImageFor.requestType}
              </p>
              <img
                src={expandedImageFor.uploadedImage || 'https://via.placeholder.com/1200x800?text=No+Image'}
                alt={`${expandedImageFor.requestType} expanded`}
                referrerPolicy="no-referrer"
                className="w-full max-h-[75vh] object-contain rounded-lg border border-slate-700 bg-slate-950"
              />
            </div>
          </div>
        </>
      )}
      <BackButton />
    </ProtectedRoute>
  )
}

```

# FILE: src/components/shared/SmartSidebar.tsx

```
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import ZionMedLogo from '@/components/ZionMedLogo'
import SidebarFooter from '@/components/shared/SidebarFooter'
import { LayoutDashboard, FolderArchive, Stethoscope } from 'lucide-react'
import {
  getDepartmentForPath,
  DEPARTMENT_NAV,
  getDashboardHref,
} from '@/config/sidebarNav'

export default function SmartSidebar() {
  const pathname = usePathname()
  // Treat /admin/<dept> as an admin-view of that department for mirroring
  const deptPath =
    pathname.startsWith('/admin/') ? pathname.replace('/admin', '') || '/' : pathname
  const { user } = useAuth()

  if (!user) return null

  const isAdmin = user.role === 'ADMIN'
  const deptKey = getDepartmentForPath(deptPath)
  const deptConfig = deptKey ? DEPARTMENT_NAV[deptKey] : null
  const navItems = deptConfig
    ? deptConfig.items
    : [{ href: getDashboardHref(user.role), label: 'Dashboard' }]

  return (
    <aside className="w-64 glass border-r border-slate-800/50 flex flex-col" dir="ltr">
      <div className="p-6 border-b border-slate-800/50">
        <ZionMedLogo size="md" showText={true} />
        <p className="text-xs mt-2.5 ml-1 font-medium text-cyan-400">
          {isAdmin && deptConfig ? deptConfig.roleLabel : user.role}
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        {/* Only one item active: the one whose path matches current URL (longest match wins) */}
        {navItems.map((item) => {
          const base = item.href.split('?')[0].split('#')[0]
          const pathMatches = pathname === base || pathname.startsWith(base + '/')
          const activeHref = navItems.reduce<string | null>((bestHref, it) => {
            const b = it.href.split('?')[0].split('#')[0]
            const match = pathname === b || pathname.startsWith(b + '/')
            if (!match) return bestHref
            if (!bestHref) return it.href
            const bestBase = bestHref.split('?')[0].split('#')[0]
            return b.length > bestBase.length ? it.href : bestHref
          }, null)
          const isActive = pathMatches && activeHref === item.href
          const isArchive = item.href === '/accountant/archive'
          const isDoctor = item.href.startsWith('/doctor')
          const Icon = isArchive ? FolderArchive : isDoctor ? Stethoscope : LayoutDashboard
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-slate-300 hover:bg-slate-800/30 hover:text-white'
              }`}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <SidebarFooter />
    </aside>
  )
}

```

# FILE: src/components/admin/AdminContextSidebar.tsx

```
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  FileText,
  Settings,
  Users,
  UserPlus,
  ClipboardList,
  Package,
  FileStack,
  FlaskConical,
  TestTube,
} from 'lucide-react'
import SidebarFooter from '@/components/shared/SidebarFooter'

export default function AdminContextSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const isReception = pathname.includes('/admin/reception') || pathname === '/reception'
  const isPharmacy = pathname.includes('/admin/pharmacy') || pathname === '/pharmacy' || pathname.startsWith('/pharmacy/')
  const isLab = pathname.includes('/admin/lab') || pathname === '/lab' || pathname.startsWith('/lab/')
  const isMainAdmin =
    pathname === '/admin' ||
    pathname === '/admin/dashboard' ||
    pathname === '/admin/departments' ||
    pathname === '/admin/reports' ||
    pathname.startsWith('/admin/settings')

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-slate-950/80 backdrop-blur-md border-r border-slate-800 overflow-hidden" dir="ltr">
      {/* Header */}
      <div className="px-4 py-5 border-b border-slate-800 flex items-center gap-3 flex-shrink-0">
        <div className="h-9 w-9 rounded-xl bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold tracking-tight text-cyan-300">ZH</span>
        </div>
        <div className="leading-tight min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-slate-500">ZION Hospital</p>
          <p className="text-sm font-semibold text-slate-100">Admin Control</p>
        </div>
      </div>

      <nav className="flex-1 py-5 px-4 overflow-y-auto">
        <div className="flex flex-col gap-4">
        {isReception && (
          <>
            <NavLink href="/admin/reception" pathname={pathname} icon={Users} label="Patients" searchParams={searchParams} />
            <NavLink href="/admin/reception#registration" pathname={pathname} icon={UserPlus} label="Registration" searchParams={searchParams} />
            <NavLink href="/admin/reception#triage" pathname={pathname} icon={ClipboardList} label="Triage" searchParams={searchParams} />
          </>
        )}

        {isPharmacy && (
          <>
            <NavLink href="/admin/pharmacy/inventory" pathname={pathname} icon={Package} label="Inventory" searchParams={searchParams} />
            <NavLink href="/admin/pharmacy" pathname={pathname} icon={FileStack} label="Prescriptions" searchParams={searchParams} />
          </>
        )}

        {isLab && (
          <>
            <NavLink href="/admin/lab" pathname={pathname} icon={FlaskConical} label="Requests" searchParams={searchParams} />
            <NavLink href="/admin/lab/results" pathname={pathname} icon={TestTube} label="Results" searchParams={searchParams} />
          </>
        )}

        {isMainAdmin && (
          <>
            <NavLink href="/admin/dashboard" pathname={pathname} icon={LayoutDashboard} label="Dashboard" searchParams={searchParams} />
            <NavLink href="/admin/departments" pathname={pathname} icon={Building2} label="Departments" searchParams={searchParams} />
            <NavLink href="/admin/reports" pathname={pathname} icon={FileText} label="Reports" searchParams={searchParams} />
            <NavLink href="/admin/settings" pathname={pathname} icon={Settings} label="Settings" searchParams={searchParams} />
          </>
        )}
        </div>
      </nav>

      {/* Footer: Theme/Lang + Sign Out */}
      <SidebarFooter />
    </aside>
  )
}

function NavLink({
  href,
  pathname,
  searchParams,
  icon: Icon,
  label,
}: {
  href: string
  pathname: string
  searchParams?: ReturnType<typeof useSearchParams>
  icon: React.ComponentType<{ size?: number }>
  label: string
}) {
  const [hash, setHash] = useState('')
  useEffect(() => {
    setHash(typeof window !== 'undefined' ? window.location.hash : '')
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const base = href.split('?')[0].split('#')[0]
  const hrefHash = href.includes('#') ? '#' + (href.split('#')[1] || '') : ''
  const section = href.includes('section=') ? href.split('section=')[1]?.split('&')[0] : null

  let isActive: boolean
  if (section !== null && section !== undefined) {
    isActive = pathname === base && searchParams?.get('section') === section
  } else if (hrefHash) {
    isActive = pathname === base && hash === hrefHash
  } else if (base === '/admin/settings') {
    isActive = pathname === base || pathname.startsWith(base + '/')
  } else {
    // Exact pathname match only â€” only one sidebar item active at a time
    isActive = pathname === base
  }

  return (
    <Link
      href={href}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
        isActive
          ? 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/50 shadow-[0_0_0_1px_rgba(6,182,212,0.35)]'
          : 'bg-transparent text-slate-400 hover:bg-slate-800/80 hover:text-slate-50 border border-transparent'
      }`}
    >
      <span className={`inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800/60 text-slate-500'}`}>
        <Icon size={18} />
      </span>
      <span className="font-medium">{label}</span>
    </Link>
  )
}

```

# FILE: src/app/admin/layout.tsx

```
'use client'

import { usePathname } from 'next/navigation'
import AdminContextSidebar from '@/components/admin/AdminContextSidebar'
import ProtectedRoute from '@/components/shared/ProtectedRoute'
import { USER_ROLES } from '@/contexts/AuthContext'

/**
 * Single layout for all /admin routes. Context-aware sidebar only.
 * Key by pathname so sidebar always reflects current route (no stale cache).
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  return (
    <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]} redirectTo="/">
      <div className="flex h-screen bg-slate-950 overflow-hidden min-h-0 [border:none]">
        <AdminContextSidebar key={pathname} />
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto [border:none]">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}

```

# FILE: src/config/sidebarNav.ts

```
/**
 * Single source of truth for sidebar navigation.
 * Admin: Dashboard, Departments, Reports, Settings.
 * Department mirroring: when Admin is in a department, show only that department's nav (same as staff).
 */

export const ADMIN_MASTER_HREF = '/admin'
export const ADMIN_DASHBOARD_HREF = '/admin'
export const ADMIN_DEPARTMENTS_HREF = '/admin/departments'
export const ADMIN_REPORTS_HREF = '/admin/reports'
export const ADMIN_SETTINGS_HREF = '/admin/settings'

export const ROLE_DASHBOARD_HREF: Record<string, string> = {
  ADMIN: ADMIN_DASHBOARD_HREF,
  ACCOUNTANT: '/accountant?view=all',
  DOCTOR: '/doctor/queue',
  PHARMACIST: '/pharmacy/dispense',
  RECEPTIONIST: '/reception',
  ER_NURSE: '/emergency/nurse',
  INTAKE_NURSE: '/intake',
  SECURITY: '/gatekeeper',
  SECRETARY: '/doctor/queue',
  LAB_TECH: '/lab',
  RADIOLOGY_TECH: '/radiology',
  CASHIER: '/cashier',
}

export function getDashboardHref(role: string): string {
  return ROLE_DASHBOARD_HREF[role] ?? ADMIN_DASHBOARD_HREF
}

/** Nav item for department/staff sidebars */
export interface DepartmentNavItem {
  href: string
  label: string
}

/**
 * Department path prefix -> nav items shown when staff (or admin mirroring) is in that department.
 * Only links that exist in the app; no placeholder or cross-department links.
 */
export const DEPARTMENT_NAV: Record<string, { roleLabel: string; items: DepartmentNavItem[] }> = {
  '/reception': {
    roleLabel: 'Reception',
    items: [
      { href: '/reception', label: 'Dashboard' },
    ],
  },
  '/pharmacy': {
    roleLabel: 'Pharmacy',
    items: [
      { href: '/pharmacy/dispense', label: 'Orders' },
    ],
  },
  '/lab': {
    roleLabel: 'Lab',
    items: [{ href: '/lab', label: 'Dashboard' }],
  },
  '/radiology': {
    roleLabel: 'Radiology',
    items: [{ href: '/radiology', label: 'Dashboard' }],
  },
  '/sonar': {
    roleLabel: 'Sonar',
    items: [{ href: '/sonar', label: 'Dashboard' }],
  },
  '/emergency/doctor': {
    roleLabel: 'ER Doctor',
    items: [
      { href: '/emergency/doctor', label: 'Dashboard' },
      { href: '/emergency/doctor#queue', label: 'Queue' },
      { href: '/emergency/doctor#triage', label: 'Triage' },
      { href: '/emergency/doctor#patients', label: 'Patients' },
    ],
  },
  '/emergency/nurse': {
    roleLabel: 'ER Nurse',
    items: [{ href: '/emergency/nurse', label: 'Dashboard' }],
  },
  '/accountant': {
    roleLabel: 'Finance',
    items: [
      { href: '/accountant?view=all', label: 'Dashboard' },
      { href: '/accountant/archive', label: 'Archive' },
    ],
  },
  '/gatekeeper': {
    roleLabel: 'Gatekeeper',
    items: [{ href: '/gatekeeper', label: 'Dashboard' }],
  },
  '/intake': {
    roleLabel: 'Intake',
    items: [{ href: '/intake', label: 'Dashboard' }],
  },
  '/doctor': {
    roleLabel: 'Doctor',
    items: [{ href: '/doctor/queue', label: 'Queue' }],
  },
  '/diagnostics': {
    roleLabel: 'Diagnostics',
    items: [{ href: '/diagnostics', label: 'Dashboard' }],
  },
  '/cashier': {
    roleLabel: 'Cashier',
    items: [{ href: '/cashier', label: 'Dashboard' }],
  },
  '/billing': {
    roleLabel: 'Billing',
    items: [{ href: '/billing', label: 'Dashboard' }],
  },
  '/inventory': {
    roleLabel: 'Inventory',
    items: [{ href: '/inventory', label: 'Dashboard' }],
  },
}

export function getDepartmentForPath(pathname: string): keyof typeof DEPARTMENT_NAV | null {
  // Match longest key first so /pharmacy/inventory resolves to /pharmacy config
  const keys = Object.keys(DEPARTMENT_NAV) as (keyof typeof DEPARTMENT_NAV)[]
  const sorted = keys.sort((a, b) => b.length - a.length)
  for (const key of sorted) {
    if (pathname === key || pathname.startsWith(key + '/') || pathname.startsWith(key + '?')) {
      return key
    }
  }
  return null
}

```

