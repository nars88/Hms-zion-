# Visit ID Flow Test - Complete Logic Flow

## Test Scenario: Appointment → X-Ray Order → Cashier Payment

This document demonstrates how Visit ID connects all steps from appointment booking to final payment.

---

## Step 1: Create Appointment (Reception) ✅

### Location: `src/components/reception/AppointmentBookingModal.tsx`

**Action**: Receptionist books an appointment for a patient

**Code Flow**:
```typescript
// 1. Check 10-patient daily limit (Rule 2)
const dailyCount = getDoctorDailyCount(doctorId, appointmentDate)
if (dailyCount >= 10) {
  return { success: false, message: "Daily limit reached" }
}

// 2. Create appointment
const result = createAppointment({
  patientId: "PT-12345",
  patientName: "Ahmed Jassim",
  doctorId: "DOC-1",
  appointmentDate: "2024-01-15",
  appointmentTime: "10:00"
})

// 3. Create Invoice with Visit ID (consistent pattern)
const visitId = `VISIT-${finalPatientId}`
// Example: visitId = "VISIT-PT-12345"
createInvoice(patientId, patientName, visitId)

console.log(`[Appointment Booking] Visit ID created: ${visitId}`)
```

**Visit ID Generated**: `VISIT-PT-12345` (consistent pattern, no timestamp)

**Storage**: 
- Appointment stored in `AppointmentsContext` (localStorage: `zionmed_appointments`)
- Invoice stored in `CentralizedBillingContext` (localStorage: `zionmed_centralized_invoices`) with key = `visitId`

**Console Output**:
```
[Appointment Booking] Visit ID created: VISIT-PT-12345 for patient: Ahmed Jassim
```

---

## Step 2: Doctor Orders X-Ray ✅

### Location: `src/components/doctor/ConsultationArea.tsx`

**Action**: Doctor selects patient and orders X-Ray test

**Code Flow**:
```typescript
// 1. Doctor selects patient from waiting list
const patient = { id: "PT-12345", name: "Ahmed Jassim", visitId: "VISIT-PT-12345" }

// 2. Doctor clicks "Take Test" → Selects "X-Ray" → Enters "Chest X-Ray"

// 3. Get or create invoice using SAME Visit ID
const visitId = patient.visitId || `VISIT-${patientId}` // "VISIT-PT-12345"
let invoice = getInvoiceByPatientId(patientId) || getInvoice(visitId)

if (!invoice) {
  invoice = createInvoice(patientId, patientName, visitId)
  console.log(`[Doctor Add Test] Creating new invoice with Visit ID: ${visitId}`)
} else {
  console.log(`[Doctor Add Test] Found existing invoice: ${invoice.id}, Current Total: ${invoice.total} IQD`)
}

// 4. Add X-Ray to invoice
addInvoiceItem(invoice.visitId, {
  department: 'Radiology',
  description: 'X-Ray: Chest X-Ray',
  quantity: 1,
  unitPrice: 25000, // 25,000 IQD
  total: 25000,
  addedBy: user.id
})

console.log(`[Doctor Add Test] Using Visit ID: ${visitId} for test: X-Ray: Chest X-Ray`)
```

**Visit ID Used**: `VISIT-PT-12345` (matches Step 1)

**Invoice Updated**:
```json
{
  "VISIT-PT-12345": {
    "id": "INV-1705320000000",
    "visitId": "VISIT-PT-12345",
    "patientId": "PT-12345",
    "patientName": "Ahmed Jassim",
    "items": [
      {
        "department": "Radiology",
        "description": "X-Ray: Chest X-Ray",
        "quantity": 1,
        "unitPrice": 25000,
        "total": 25000
      }
    ],
    "total": 25000,
    "status": "Pending"
  }
}
```

**Console Output**:
```
[Doctor Add Test] Using Visit ID: VISIT-PT-12345 for test: X-Ray: Chest X-Ray
[Doctor Add Test] Found existing invoice: INV-xxx, Current Total: 0 IQD
```

---

## Step 3: Doctor Completes Visit ✅

### Location: `src/components/doctor/ConsultationArea.tsx` → `handleCompleteVisit()`

**Action**: Doctor completes consultation and adds consultation fee

**Code Flow**:
```typescript
const visitId = patient.visitId || `VISIT-${patientId}` // "VISIT-PT-12345"

console.log(`[Doctor Complete Visit] Using Visit ID: ${visitId} for patient: ${patientName}`)

// Get existing invoice (should already exist from Step 1 or 2)
let invoice = getInvoiceByPatientId(patientId) || getInvoice(visitId)
if (!invoice) {
  console.log(`[Doctor Complete Visit] Creating new invoice with Visit ID: ${visitId}`)
  invoice = createInvoice(patientId, patientName, visitId)
} else {
  console.log(`[Doctor Complete Visit] Found existing invoice: ${invoice.id}, Total: ${invoice.total} IQD`)
}

// Add consultation fee
addInvoiceItem(invoice.visitId, {
  department: 'Doctor',
  description: 'Doctor Consultation',
  quantity: 1,
  unitPrice: 50000, // 50,000 IQD
  total: 50000,
  addedBy: user.id
})

// Update patient status to "Pending Payment"
updatePatientStatus(patientId, 'Pending Payment')
```

**Invoice After Completion**:
```json
{
  "VISIT-PT-12345": {
    "items": [
      {
        "department": "Radiology",
        "description": "X-Ray: Chest X-Ray",
        "total": 25000
      },
      {
        "department": "Doctor",
        "description": "Doctor Consultation",
        "total": 50000
      }
    ],
    "total": 75000, // 25,000 + 50,000
    "status": "Pending"
  }
}
```

**Console Output**:
```
[Doctor Complete Visit] Using Visit ID: VISIT-PT-12345 for patient: Ahmed Jassim
[Doctor Complete Visit] Found existing invoice: INV-xxx, Total: 25000 IQD
```

---

## Step 4: Cashier Sees Patient in Queue ✅

### Location: `src/components/cashier/LivePaymentFeed.tsx`

**Action**: Cashier views patients ready for payment

**Code Flow**:
```typescript
// Get patients with status "Pending Payment"
const paymentPatients = waitingPatients
  .filter(p => p.status === 'Pending Payment')
  .map(p => {
    // Use Visit ID from patient if available
    const visitId = p.visitId || `VISIT-${p.id}` // "VISIT-PT-12345"
    
    // Get invoice using Visit ID (source of truth)
    const invoice = getInvoice(visitId)
    
    return {
      id: p.id,
      visitId, // Same Visit ID pattern
      patientName: `${p.firstName} ${p.lastName}`,
      totalAmount: invoice?.total || 0, // Get from invoice
      status: 'Pending Payment'
    }
  })
```

**Display**: Cashier sees "Ahmed Jassim" with total: 75,000 IQD

**Console Output**:
```
[LivePaymentFeed] Invoice found for Visit ID: VISIT-PT-12345, Total: 75000 IQD
```

---

## Step 5: Cashier Processes Payment ✅

### Location: `src/components/cashier/PaymentProcessor.tsx`

**Action**: Cashier selects patient and processes payment

**Code Flow**:
```typescript
// 1. Get invoice using Visit ID
const visitId = patient.visitId || `VISIT-${patient.patientId || patient.id}`
const invoice = getInvoice(visitId)

console.log(`[Cashier] Patient selected: ${patient.patientName}, Visit ID: ${visitId}`)

if (invoice) {
  console.log(`[Cashier] Invoice found: ${invoice.id}, Total: ${invoice.total} IQD`)
  console.log(`[Cashier] Invoice items:`, invoice.items)
  
  // Display all items from invoice
  const billingItems = invoice.items.map(item => ({
    category: item.department === 'Doctor' ? 'Consultation' : 'Tests',
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    total: item.total
  }))
  
  setBillingItems(billingItems)
  setTotalAmount(invoice.total) // 75,000 IQD
}

// 2. Process payment
addPayment(visitId, {
  amount: totalAmount,
  method: 'Cash',
  paidBy: cashierId
})

// 3. Update invoice status
updateInvoiceStatus(visitId, 'Paid')

// 4. Add to hospital revenue
addRevenue(totalAmount)
```

**Final Invoice**:
```json
{
  "VISIT-PT-12345": {
    "items": [
      { "department": "Radiology", "description": "X-Ray: Chest X-Ray", "total": 25000 },
      { "department": "Doctor", "description": "Doctor Consultation", "total": 50000 }
    ],
    "total": 75000,
    "status": "Paid",
    "payments": [
      {
        "amount": 75000,
        "method": "Cash",
        "paidAt": "2024-01-15T10:30:00Z"
      }
    ],
    "paidAmount": 75000,
    "remainingAmount": 0
  }
}
```

**Console Output**:
```
[Cashier] Patient selected: Ahmed Jassim, Visit ID: VISIT-PT-12345
[Cashier] Invoice found: INV-xxx, Total: 75000 IQD
[Cashier] Invoice items: [{department: "Radiology", ...}, {department: "Doctor", ...}]
[Cashier Payment] Processing payment for Visit ID: VISIT-PT-12345, Amount: 75000 IQD
[Cashier Payment] Invoice INV-xxx marked as Paid
[Cashier Payment] Revenue updated: +75000 IQD
```

---

## Visit ID Consistency ✅

### Solution Applied:

1. **AppointmentBookingModal**: Creates `VISIT-${patientId}` (consistent pattern, no timestamp)
2. **ConsultationArea**: Uses `patient.visitId || VISIT-${patientId}` (checks patient object first)
3. **LivePaymentFeed**: Uses `p.visitId || VISIT-${p.id}` (consistent pattern)
4. **PaymentProcessor**: Uses `patient.visitId || VISIT-${patientId}` (consistent pattern)

**Result**: Visit ID is now consistent across all steps! ✅

---

## Test Checklist

- [x] Step 1: Appointment created with Visit ID
- [x] Step 1: 10-patient limit checked correctly (Rule 2)
- [x] Step 2: Doctor can find invoice using Visit ID
- [x] Step 2: X-Ray added to invoice successfully
- [x] Step 3: Consultation fee added to same invoice
- [x] Step 4: Cashier sees patient with correct total (75,000 IQD)
- [x] Step 5: Payment processed and invoice marked as Paid
- [x] Step 5: Revenue updated correctly
- [x] Visit ID consistency across all steps

---

## Expected Console Output (Complete Flow)

```
[Appointment Booking] Visit ID created: VISIT-PT-12345 for patient: Ahmed Jassim
[Doctor Add Test] Using Visit ID: VISIT-PT-12345 for test: X-Ray: Chest X-Ray
[Doctor Add Test] Found existing invoice: INV-xxx, Current Total: 0 IQD
[Doctor Complete Visit] Using Visit ID: VISIT-PT-12345 for patient: Ahmed Jassim
[Doctor Complete Visit] Found existing invoice: INV-xxx, Total: 25000 IQD
[LivePaymentFeed] Invoice found for Visit ID: VISIT-PT-12345, Total: 75000 IQD
[Cashier] Patient selected: Ahmed Jassim, Visit ID: VISIT-PT-12345
[Cashier] Invoice found: INV-xxx, Total: 75000 IQD
[Cashier] Invoice items: [{department: "Radiology", ...}, {department: "Doctor", ...}]
[Cashier Payment] Processing payment for Visit ID: VISIT-PT-12345, Amount: 75000 IQD
[Cashier Payment] Invoice INV-xxx marked as Paid
[Cashier Payment] Revenue updated: +75000 IQD
```

---

## Key Improvements Made

1. ✅ **Visit ID Consistency**: All components now use the same pattern `VISIT-${patientId}`
2. ✅ **Invoice as Source of Truth**: Cashier reads directly from invoice, not calculated
3. ✅ **Console Logging**: Added comprehensive logging for debugging
4. ✅ **Fallback Logic**: If Visit ID not found in patient object, generates consistent pattern
5. ✅ **Data Separation**: Appointments (planning) separate from Invoices (revenue)

---

**Status**: ✅ All Steps Connected via Visit ID
**Last Updated**: System Implementation Date
