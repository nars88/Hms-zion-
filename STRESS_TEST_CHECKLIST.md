# ZION Hospital Management System - Stress Test Checklist

## Scenario A: The Clinic Patient (Routine)

### ✅ Step 1: Reception Registration
- [ ] Login as **Receptionist** (`reception` / `123`)
- [ ] Navigate to `/intake` or `/reception`
- [ ] Register **Patient A**:
  - Full Name: `Ahmed Ali`
  - Age: `35`
  - Phone: `07701234567`
  - Gender: `Male`
  - Department: **General Clinic** (NOT ER)
- [ ] Verify: Success message appears
- [ ] Verify: Patient appears in "Waiting List" for Intake Nurse

### ✅ Step 2: Intake Nurse - Record Vitals
- [ ] Login as **Intake Nurse** (or use Receptionist account)
- [ ] Navigate to `/intake`
- [ ] Find **Patient A** in "Waiting List"
- [ ] Click **"Enter Vitals"**
- [ ] Fill in vitals:
  - BP: `120/80`
  - Temp: `36.5`
  - HR: `72`
  - Weight: `75`
  - Allergies: `None`
  - Triage Level: **4** or **5** (Routine)
- [ ] Click **"Save Vitals"**
- [ ] Verify: Patient disappears from Waiting List
- [ ] Verify: Patient now appears in Doctor's Queue

### ✅ Step 3: Doctor Consultation
- [ ] Login as **Doctor** (`doctor` / `123`)
- [ ] Navigate to `/doctor`
- [ ] Verify: **Patient A** appears in **normal queue** (NOT at top)
- [ ] Verify: Patient card shows **ESI 4** or **ESI 5** badge (NOT flashing red)
- [ ] Click on **Patient A**
- [ ] Verify: Consultation area opens
- [ ] Verify: No red flashing alert banner
- [ ] Enter:
  - Diagnosis: `Routine checkup - healthy`
  - Prescription: `Paracetamol 500mg - 1x2 for 3 days`
- [ ] Select **Final Disposition**: `Discharge`
- [ ] Click **"Complete Visit & Generate Invoice"**
- [ ] Verify: Success message appears
- [ ] Verify: Patient removed from queue

### ✅ Step 4: Accountant - View Invoice
- [ ] Login as **Accountant** (`accountant` / `123`)
- [ ] Navigate to `/accountant`
- [ ] Verify: **Patient A's invoice** appears in list
- [ ] Click on invoice
- [ ] Verify: Invoice shows:
  - Service items: `Doctor Consultation` + `Paracetamol` (if dispensed)
  - Total amount calculated correctly
  - **Privacy Check**: NO diagnosis visible, only service names
  - QR Status: **LOCKED** (Red badge)
- [ ] Click **"Mark as Paid"**
- [ ] Verify: QR Status changes to **CLEARED** (Green badge)
- [ ] Verify: Payment Status: **Paid**

### ✅ Step 5: Security - QR Check
- [ ] Login as **Security** (or use Admin account)
- [ ] Navigate to `/security`
- [ ] Enter **Patient A's ID** (from invoice or patient record)
- [ ] Click **"Check"**
- [ ] **Before Payment**: Verify **RED STOP** icon + "EXIT BLOCKED"
- [ ] **After Payment**: Verify **GREEN CHECK** icon + "CLEARED FOR EXIT"

---

## Scenario B: The ER Patient (Critical)

### ✅ Step 1: Reception Registration
- [ ] Login as **Receptionist**
- [ ] Navigate to `/intake`
- [ ] Register **Patient B**:
  - Full Name: `Fatima Hassan`
  - Age: `28`
  - Phone: `07709876543`
  - Gender: `Female`
  - Department: **ER** (Emergency)
- [ ] Verify: Success message appears
- [ ] Verify: Patient appears in "Waiting List"

### ✅ Step 2: Intake Nurse - Record Critical Vitals
- [ ] Navigate to `/intake`
- [ ] Find **Patient B** in "Waiting List"
- [ ] Click **"Enter Vitals"**
- [ ] Fill in **CRITICAL** vitals:
  - BP: `150/100` (High)
  - Temp: `39.2` (High fever)
  - HR: `110` (High heart rate)
  - Weight: `65`
  - Allergies: `Penicillin` (IMPORTANT: For pharmacy test)
  - Triage Level: **1** or **2** (CRITICAL)
- [ ] Click **"Save Vitals"**
- [ ] Verify: Patient disappears from Waiting List

### ✅ Step 3: Doctor Consultation - Critical Alert
- [ ] Login as **Doctor**
- [ ] Navigate to `/doctor`
- [ ] **CRITICAL CHECK**: Verify **Patient B** appears at the **TOP** of queue
- [ ] **CRITICAL CHECK**: Verify **FLASHING RED ALERT BANNER** at top:
  - Text: `⚠️ 1 CRITICAL PATIENT(S) - TRIAGE LEVEL 1-2`
  - Red background with pulse animation
- [ ] **CRITICAL CHECK**: Verify **Patient B's card**:
  - Entire card has **red background** with **flashing animation**
  - Badge shows: `ESI 1 - CRITICAL` or `ESI 2 - CRITICAL`
  - Red glow/shadow effect
  - Patient name in **red text**
- [ ] Click on **Patient B**
- [ ] Verify: Consultation area opens
- [ ] Verify: **Yellow Allergy Alert Box** appears (if allergies recorded)
- [ ] Enter:
  - Diagnosis: `Severe infection - requires immediate treatment`
  - Prescription: `Amoxicillin 500mg - 1x3 for 7 days` (⚠️ This conflicts with Penicillin allergy!)
- [ ] Select **Final Disposition**: `Admit to Ward`
- [ ] Click **"Complete Visit & Generate Invoice"**
- [ ] Verify: Success message appears

### ✅ Step 4: Pharmacy - Allergy Safety Check
- [ ] Login as **Pharmacist** (`pharmacy` / `123`)
- [ ] Navigate to `/pharmacy`
- [ ] Verify: **Patient B's prescription** appears in queue
- [ ] Click on prescription
- [ ] **CRITICAL CHECK**: Verify **RED BANNER** appears:
  - Title: `⚠️ Drug-Allergy Interaction Alert`
  - Message: `Patient is allergic to: Penicillin`
  - Lists conflicting medication: `Amoxicillin`
  - Warning text about potential reaction
- [ ] Click **"Confirm Dispense (Internal - Add to Invoice)"**
- [ ] **CRITICAL CHECK**: Verify **confirmation dialog** appears:
  - Message: `WARNING: Patient is allergic to: Penicillin. Conflicting medications: Amoxicillin. Are you sure you want to dispense these medications?`
- [ ] Click **"OK"** (to test the override flow)
- [ ] Verify: Medication dispensed and added to invoice
- [ ] Verify: Visit status updated to "Ready for Pickup"

### ✅ Step 5: Accountant - View Invoice
- [ ] Login as **Accountant**
- [ ] Navigate to `/accountant`
- [ ] Verify: **Patient B's invoice** appears
- [ ] Click on invoice
- [ ] Verify: Invoice shows:
  - Service items: `Doctor Consultation` + `Amoxicillin`
  - **Privacy Check**: NO diagnosis visible (only service names)
  - QR Status: **LOCKED**

### ✅ Step 6: Security - QR Check
- [ ] Navigate to `/security`
- [ ] Enter **Patient B's ID**
- [ ] Verify: **RED STOP** (not paid yet)
- [ ] Go back to Accountant, mark as paid
- [ ] Return to Security, check again
- [ ] Verify: **GREEN CHECK** (cleared for exit)

---

## Additional Verification Tests

### ✅ Triage Sorting Logic
- [ ] Create multiple patients with different triage levels (1, 2, 3, 4, 5)
- [ ] Verify: Doctor queue shows patients in order: **1, 2, 3, 4, 5** (1 at top)
- [ ] Verify: All Triage 1-2 patients appear **before** Triage 3-5 patients

### ✅ Department Filtering
- [ ] Verify: ER patients have `chiefComplaint: 'Emergency visit (ER)'`
- [ ] Verify: Clinic patients have `chiefComplaint: 'Clinic visit (Outpatient)'`
- [ ] Verify: Both appear in same doctor queue (sorted by triage, not department)

### ✅ Privacy Protection
- [ ] As **Accountant**, verify you CANNOT see:
  - Diagnosis text
  - Medical notes
  - Doctor's clinical observations
- [ ] As **Accountant**, verify you CAN see:
  - Service names (e.g., "Doctor Consultation")
  - Medication names (e.g., "Paracetamol 500mg")
  - Prices and totals

### ✅ QR Status Flow
- [ ] Verify: New invoices default to **LOCKED** (Red)
- [ ] Verify: After Accountant marks as paid → **CLEARED** (Green)
- [ ] Verify: Security guard sees correct status in real-time

### ✅ Manual Override (Admin)
- [ ] Login as **Admin**
- [ ] Navigate to `/admin` → **Settings**
- [ ] Scroll to **"Manual QR Override"** section
- [ ] Enter Patient ID, Visit ID, and Reason
- [ ] Click **"Clear QR Status (Manual Override)"**
- [ ] Verify: QR status cleared
- [ ] Verify: Audit log entry created in visit notes

---

## Expected Results Summary

### Scenario A (Routine):
- ✅ Patient appears in normal queue (not at top)
- ✅ No flashing red alerts
- ✅ Standard billing flow
- ✅ QR locks/unlocks correctly

### Scenario B (Critical):
- ✅ Patient appears **AT TOP** of queue
- ✅ **FLASHING RED ALERT BANNER** visible
- ✅ Patient card has red flashing background
- ✅ Pharmacy shows **RED ALLERGY ALERT** for conflicting medication
- ✅ Confirmation dialog prevents accidental dispensing
- ✅ All privacy rules enforced

---

## Issues to Report

If any step fails, document:
1. **Step Number**: Which step failed
2. **Expected Behavior**: What should have happened
3. **Actual Behavior**: What actually happened
4. **Screenshot**: If possible
5. **Console Errors**: Check browser console for errors

---

**Test Date**: _______________  
**Tester**: _______________  
**Status**: ⬜ Pass  ⬜ Fail  ⬜ Partial

