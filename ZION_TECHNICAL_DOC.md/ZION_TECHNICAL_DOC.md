
🏥 ZION Hospital Management System - Master Plan (Final Version)
📌 Core Architecture & Security Protocols
Source of Truth: This document is the final reference. Any legacy code must be refactored to align with this plan.

Security: Use Bcrypt for passwords and AES-256 encryption for sensitive patient data.

Data Masking: Non-medical staff (Accountants/Admin) see only service names and prices; medical diagnoses/results are hidden from them.

Fail-safe: Implement a Manual Override Log for the QR Exit Gate to ensure safety during system or internet outages.

🏢 1. Shared Reception & Advanced Intake
Unified Desk: Single point of entry for both ER and Clinic registrations.

Intake Nurse Module:

Vitals Entry: BP, Temp, HR, Weight (Mandatory step for all patients).

Allergy Alert (Mandatory): Nurse must input allergies; triggers a Yellow Warning on the Doctor's screen.

Smart Triage (ESI Level 1-5): Level 1 & 2 cases jump to the top of the queue with a Flashing Red Alert.

🚑 2. Emergency & Clinic Dashboards
ER Bed Grid: Real-time visual tracking (🔴 Critical, 🟡 Observation, 🟢 Available).

Clinic Secretary Dashboard: Manages digital queues based on intake time and triage level.

Longitudinal EHR (History): Doctors can access a "History Tab" to view past visits, medications, and vital trends.

Decision Locking: Doctors cannot close a file without selecting a final action (Discharge, Admit, or Refer).

📋 3. Automated Billing & Fraud Prevention
Unified Digital Invoice: All services (Consultation + Vitals + Labs + Meds) are auto-calculated using fixed DB pricing.

Cashier Reconciliation: End-of-shift reports must match the physical cash drawer to the digital "Paid" status.

No-Prepayment: Billing is finalized and paid only at the end of the visit.

💊 4. Pharmacy & Diagnostics
Safety Check: System flags potential drug-allergy interactions before dispensing.

Paperless Sync: Orders are sent instantly to Pharmacy/Lab; Nurses are notified when meds are "Ready for Pickup."

🏁 5. The Exit Protocol (Security)
QR Lock Logic: QR status = "Locked" by default. Changes to "Clear for Exit" only when the Accountant marks the invoice as Paid.

Security UI: Guards see a simple Green/Red status upon scanning the patient's QR code.

🛡️ 6. System Integrity (Backend)
Input Validation: Use Zod/Prisma for strict validation to prevent SQL Injection.

Interoperability: DB schema must be JSON-structured to support HL7/FHIR standards for future medical data exchange.

Automated Backups: Daily database backups to ensure zero data loss.

Scalable Architecture: Built to handle high traffic (10,000+ records) without performance drops.

🚀 Immediate Next Steps for Cursor:
Initialize DB Schema: Focus on Patient, Vitals, Triage, and Invoice relations.

Setup Role-Based Access: Implement the Tag System (Admin, Intake_Nurse, Doctor, etc.).

Build Reception Flow: Create the registration + vitals entry UI as the first milestone.