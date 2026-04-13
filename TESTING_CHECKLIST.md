# ZION Hospital System - Manual Testing Checklist

Use this checklist to manually verify the full patient journey and system integration.

---

## Pre-Test Setup

- [ ] Clear browser localStorage (to start fresh)
- [ ] Login as Receptionist
- [ ] Verify language toggle works (EN ↔ AR)

---

## Test 1: Standard Clinic Visit (Appointment-Based)

### Step 1: Reception - Patient Registration
- [ ] Click "New Patient"
- [ ] Fill patient details: Name, DOB, Gender, Phone
- [ ] Submit registration
- [ ] Verify patient added to waiting list
- [ ] **Check:** Visit ID created (check console: `VISIT-...`)
- [ ] **Check:** Invoice placeholder created

### Step 2: Reception - Appointment Booking
- [ ] Select registered patient
- [ ] Click "Book Appointment"
- [ ] Select doctor: Dr. Smith
- [ ] Select date: Today
- [ ] Select time: 10:00 AM
- [ ] Submit appointment
- [ ] **Check:** Appointment created successfully
- [ ] **Check:** Daily count shows: 1/10

### Step 3: Reception - Daily Limit Test
- [ ] Book 9 more appointments for Dr. Smith (same day)
- [ ] **Check:** Daily count shows: 10/10
- [ ] Attempt 11th appointment
- [ ] **Check:** Error message: "Daily limit reached"
- [ ] **Check:** 11th appointment blocked

### Step 4: Doctor - Consultation
- [ ] Login as Doctor
- [ ] Select patient from waiting list
- [ ] Enter diagnosis: "Upper respiratory infection"
- [ ] Add prescription: "Amoxicillin 500mg - Twice daily"
- [ ] Order lab test: "Chest X-Ray"
- [ ] Click "Complete Visit"
- [ ] **Check:** Consultation fee added to invoice (50,000 IQD)
- [ ] **Check:** Lab request created
- [ ] **Check:** Prescription sent to Pharmacy
- [ ] **Check:** Visit ID maintained throughout

### Step 5: Pharmacy - Dispense Medication
- [ ] Login as Pharmacist
- [ ] View pending prescriptions
- [ ] Select prescription for patient
- [ ] Click "Confirm Dispense (Internal)"
- [ ] **Check:** Stock deducted from inventory
- [ ] **Check:** Cost added to invoice
- [ ] **Check:** Prescription status: "Dispensed_Internal"

### Step 6: Cashier - Payment
- [ ] Login as Cashier
- [ ] Select patient from payment queue
- [ ] **Check:** Invoice shows all items:
  - Consultation fee
  - Lab test
  - Pharmacy medication
- [ ] Select payment method: Cash
- [ ] Click "Confirm Payment"
- [ ] **Check:** Invoice status: "Paid"
- [ ] **Check:** Revenue updated

### Step 7: Financial Reports
- [ ] Login as Admin
- [ ] Go to Manager Dashboard
- [ ] **Check:** Total Revenue = Sum of paid invoices
- [ ] **Check:** Pending invoices NOT counted
- [ ] **Check:** Department breakdown correct
- [ ] **Check:** Reports read from CentralizedBillingContext only

---

## Test 2: ER Fast Track (Should Bypass Appointments)

### Step 1: ER Registration
- [ ] Register ER patient (should bypass appointment)
- [ ] **Check:** No appointment booking required
- [ ] **Check:** No daily limit check
- [ ] **Check:** Visit ID created
- [ ] **Check:** Patient goes directly to ER queue

**STATUS:** ❌ **NOT IMPLEMENTED** - This test will fail

### Step 2: ER Quick Diagnosis
- [ ] Doctor selects ER patient
- [ ] **Check:** Quick-action buttons visible (Fever, Injury, etc.)
- [ ] **Check:** Flexible text field for custom notes
- [ ] Use quick-action button: "Fever"
- [ ] Add custom note: "High temperature, 39°C"
- [ ] **Check:** Diagnosis recorded

**STATUS:** ❌ **NOT IMPLEMENTED** - This test will fail

### Step 3: ER Quick Procedures
- [ ] Click "IV Injection" button
- [ ] **Check:** Procedure added to invoice
- [ ] **Check:** Inventory item deducted (if applicable)
- [ ] **Check:** Cost added to bill

**STATUS:** ❌ **NOT IMPLEMENTED** - This test will fail

---

## Test 3: Pharmacy - External Prescription

### Step 1: External Prescription
- [ ] Doctor creates prescription
- [ ] Pharmacist views prescription
- [ ] Click "External Prescription (Print Only)"
- [ ] **Check:** Prescription printed
- [ ] **Check:** Scientific names included
- [ ] **Check:** Trade names included
- [ ] **Check:** NO invoice item added
- [ ] **Check:** Prescription status: "Dispensed_External"

**STATUS:** ⚠️ **PARTIAL** - Status works, print format needs verification

---

## Test 4: Inventory Alerts

### Step 1: Low Stock Alert
- [ ] Go to Inventory
- [ ] Add medicine: Stock = 5, Minimum = 10
- [ ] Go to Inventory Alerts
- [ ] **Check:** "Low Stock" alert displayed
- [ ] **Check:** Visual indicator (red/yellow)
- [ ] **Check:** Medicine name and stock shown

**STATUS:** ✅ **PASS** - Should work

### Step 2: Near Expiry Alert
- [ ] Add medicine: Expiry date = 2 months from now
- [ ] Go to Inventory Alerts
- [ ] **Check:** "Near Expiry" alert displayed
- [ ] **Check:** Expiry date shown
- [ ] **Check:** Filtered by 3 months (default)

**STATUS:** ✅ **PASS** - Should work

---

## Test 5: Language Toggle

### Step 1: Toggle Language
- [ ] Click language toggle (EN ↔ AR)
- [ ] **Check:** UI flips to RTL when Arabic selected
- [ ] **Check:** All text translated
- [ ] **Check:** Layout adjusts (RTL/LTR)
- [ ] Refresh page
- [ ] **Check:** Language preference persists

**STATUS:** ✅ **PASS** - Should work

---

## Test 6: Permissions & Roles

### Step 1: Role-Based Access
- [ ] Login as Admin
- [ ] **Check:** Full access to all pages
- [ ] Login as Doctor
- [ ] **Check:** Only doctor pages accessible
- [ ] **Check:** Cannot access pharmacy pages
- [ ] Login as Pharmacist
- [ ] **Check:** Only pharmacy pages accessible
- [ ] Login as Receptionist
- [ ] **Check:** Only reception pages accessible

**STATUS:** ✅ **PASS** - Should work

---

## Test 7: Financial Reporting - Net Profit

### Step 1: Expenses Management
- [ ] Login as Admin
- [ ] Go to Financials page (`/admin/financials`)
- [ ] **Check:** Expenses section available
- [ ] Add expense: Rent = 1,000,000 IQD
- [ ] Add expense: Salaries = 2,000,000 IQD
- [ ] **Check:** Net Profit = Revenue - Expenses

**STATUS:** ❌ **NOT IMPLEMENTED** - Financials page is empty

---

## Test 8: Visit ID Consistency

### Step 1: Visit ID Pattern Check
- [ ] Register new patient
- [ ] **Check:** Visit ID format in console
- [ ] **Expected:** `VISIT-PT-{patientId}`
- [ ] **Current:** `VISIT-{timestamp}` (inconsistent)
- [ ] Complete full patient journey
- [ ] **Check:** Visit ID maintained throughout
- [ ] **Check:** Invoice retrieved using Visit ID

**STATUS:** ⚠️ **PARTIAL** - Works but pattern inconsistent

---

## Expected Test Results Summary

| Test | Expected Result | Actual Status |
|------|----------------|--------------|
| Standard Clinic Visit | ✅ Pass | ✅ Should Pass |
| Daily Limit | ✅ Pass | ✅ Should Pass |
| Pharmacy Dispense | ✅ Pass | ✅ Should Pass |
| Payment Processing | ✅ Pass | ✅ Should Pass |
| Revenue Reports | ✅ Pass | ✅ Should Pass |
| ER Fast Track | ✅ Pass | ❌ **FAIL** - Not Implemented |
| External Prescription | ✅ Pass | ⚠️ **PARTIAL** - Print format unknown |
| Inventory Alerts | ✅ Pass | ✅ Should Pass |
| Language Toggle | ✅ Pass | ✅ Should Pass |
| Role Permissions | ✅ Pass | ✅ Should Pass |
| Net Profit | ✅ Pass | ❌ **FAIL** - Not Implemented |
| Visit ID Consistency | ✅ Pass | ⚠️ **PARTIAL** - Pattern inconsistent |

---

## Critical Issues to Fix

1. **ER Fast Track System** - Not implemented (CRITICAL)
2. **Net Profit Calculation** - Not implemented (MEDIUM)
3. **Visit ID Pattern** - Inconsistent (MEDIUM)

---

## Notes

- All tests should be performed in a clean browser session
- Check browser console for Visit ID logs
- Verify localStorage data after each step
- Test both English and Arabic languages
- Test with different user roles

---

**Last Updated:** $(date)

