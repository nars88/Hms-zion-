# ZION HOSPITAL - Data Separation Rules

## Overview
This document outlines the strict separation between **Appointments** (Planning & Limits) and **Invoices** (Actual Revenue) to prevent conflicts between Appointment Automation and Report Automation.

---

## Rule 1: Data Separation

### Appointments Table ≠ Revenue Table

**Appointments Context** (`AppointmentsContext.tsx`):
- Manages scheduling, planning, and daily limits
- **DOES NOT** affect revenue or financial reports
- Stores: patient appointments, doctor availability, daily limits

**Centralized Billing Context** (`CentralizedBillingContext.tsx`):
- Manages actual revenue and payments
- **ONLY** source for Manager Reports and KPIs
- Stores: invoices, payments, revenue

### Manager Reports MUST:
✅ Read **ONLY** from `CentralizedBillingContext` (Invoices/Revenue)
❌ **NEVER** read from `AppointmentsContext` (Appointments)

### Files That Follow Rule 1:
- `src/components/manager/KPICards.tsx` - Reads only from `useCentralizedBilling()`
- `src/components/manager/DepartmentRevenueReport.tsx` - Reads only from `useCentralizedBilling()`
- `src/components/manager/InvoiceStatusAnalytics.tsx` - Reads only from `useCentralizedBilling()`
- `src/components/manager/MonthlyReportGenerator.tsx` - Reads only from `useCentralizedBilling()`

---

## Rule 2: The 10-Patient Daily Limit

### Limit Check Source: Appointments Table ONLY

**The daily limit of 10 patients must be checked against the Appointment Table for that specific day.**

### Implementation:
- Function: `getDoctorDailyCount()` in `AppointmentsContext.tsx`
- Checks: All appointments for a doctor on a specific date
- Excludes: `Cancelled` and `No_Show` appointments
- **Independent of Payment Status**: Counts appointments whether paid or not

### Logic:
```typescript
// Rule 2: Checks ONLY Appointments Table
const dailyCount = getDoctorDailyCount(doctorId, date)
if (dailyCount >= 10) {
  // Lock booking - regardless of payment status
  return { available: false, reason: "Daily limit reached" }
}
```

### Files That Follow Rule 2:
- `src/contexts/AppointmentsContext.tsx` - `getDoctorDailyCount()` checks only appointments
- `src/contexts/AppointmentsContext.tsx` - `checkDoctorAvailability()` uses appointments count
- `src/components/reception/AppointmentBookingModal.tsx` - Uses `getDoctorDailyCount()` for limit check

---

## Summary

### Appointments = Planning & Limits
- ✅ Used for: Scheduling, daily limits, availability checks
- ❌ Does NOT affect: Revenue, financial reports, KPIs

### Invoices = Actual Revenue
- ✅ Used for: Manager reports, KPIs, revenue analytics
- ❌ Does NOT affect: Appointment booking limits

---

## Key Points

1. **Appointment booking** creates an invoice placeholder but does NOT add to revenue until payment is made
2. **Manager reports** read ONLY from paid invoices, never from appointments
3. **Daily limit (10 patients)** is checked ONLY against appointments table, regardless of payment status
4. **Revenue** is recorded ONLY when payment is actually made (via Cashier)

---

## Verification Checklist

- [x] `KPICards.tsx` - No `useAppointments()` import
- [x] `DepartmentRevenueReport.tsx` - No `useAppointments()` import
- [x] `InvoiceStatusAnalytics.tsx` - No `useAppointments()` import
- [x] `MonthlyReportGenerator.tsx` - No `useAppointments()` import
- [x] `AppointmentBookingModal.tsx` - Uses `getDoctorDailyCount()` from Appointments
- [x] `AppointmentsContext.tsx` - `getDoctorDailyCount()` checks only appointments table
- [x] All manager components read only from `CentralizedBillingContext`

---

**Last Updated**: System Implementation Date
**Status**: ✅ Rules Applied and Documented

