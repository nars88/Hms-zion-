# ZION Med HMS - System Documentation

## System Overview

ZION Med HMS is a role-driven Hospital Management System built on Next.js and Prisma/PostgreSQL, with operational focus on:

- Emergency Room (ER) intake, doctor workflow, diagnostics, nursing tasks, and discharge handoff.
- Pharmacy dispensing with stock-aware workflows and invoice integration.
- Accounts/billing settlement with controlled payment finalization and QR-gated exit flow.

The platform uses API routes under `src/app/api`, JWT cookie authentication, and strict RBAC controls enforced in both middleware and route handlers.

---

## Core Workflows

## 1) ER Admission Workflow (Automated ER Admission Fee)

### Trigger
- A new ER visit is created from ER registration endpoints (ER quick or ER reception paths).

### Billing Behavior
- The system resolves a default catalog service code: `ER_ADMISSION_FEE`.
- A base fee (default 10,000 IQD) is inserted into the visit bill automatically.
- The insertion is idempotent (guarded) so the same visit is not double-charged on refresh/retry.

### Implementation Notes
- Centralized helper logic in billing utility (`ensureErAdmissionBill`).
- Fee is sourced from `ServiceCatalog` when available; falls back to default constant.

---

## 2) Pharmacy Workflow (Grouping + Dispensed-Only Billing)

### Prescription Grouping Logic
- Doctor can send one medication item with `quantity > 1` (not duplicated rows).
- Pharmacy API groups medications by medication identity and aggregates quantities.
- UI displays grouped medication format (example: `Paracetamol (x2)`), improving safety and reducing duplicate rows.

### Billing Rule
- Only medication items that are actually **DISPENSED** affect financial totals.
- Pending/out-of-stock/non-dispensed orders do not finalize as paid medication revenue.
- On dispensing, bill lines are appended with `unitPrice * quantity` and totals are recalculated.

### Stock Behavior
- Normal flow checks inventory and deducts stock.
- Where configured, missing inventory can be handled by controlled fallback/bypass for workflow continuity.

---

## 3) Discharge & Bed Release Workflow

### Discharge Action
- Doctor discharge transitions visit to billing-facing state (not immediate financial closure).
- Bed allocation is released by clearing `visit.bedNumber` (no legacy `er_bed_id` dependency).

### Result/Order Safety
- Discharge-related endpoints validate unresolved diagnostics where applicable.
- Billing remains visible to Accounts until payment completion.

### Outcome
- Clinical occupancy is cleared.
- Financial responsibility remains active for Accountant settlement.

---

## Security Architecture

## Authentication

- Auth token: `zionmed_auth_token` (JWT in cookie).
- Validation path:
  - Global API gate in middleware (token required for protected API paths).
  - Route-level identity validation via `getRequestUser(request)`.
- Cookie policy:
  - `httpOnly: true`
  - `secure: process.env.NODE_ENV === 'production'`
  - `sameSite: 'lax'`

## RBAC Enforcement Model

RBAC is applied in two layers:

1. **Middleware-level** role prefix checks for mutating methods (`POST/PATCH/PUT/DELETE`).
2. **Route-level** explicit `unauthorized()` / `forbidden()` checks for sensitive handlers.

### RBAC Matrix (Primary Domains)

| Domain Prefix | Allowed Roles |
|---|---|
| `/api/admin/*` | `ADMIN` |
| `/api/employees/*` | `ADMIN` |
| `/api/doctor/*` | `DOCTOR`, `ADMIN` |
| `/api/pharmacy/*` | `PHARMACIST`, `ADMIN` |
| `/api/accountant/*` | `ACCOUNTANT`, `ADMIN` |
| `/api/lab/*` | `LAB_TECH`, `ADMIN` |

### Operational Role Intent

| Role | Functional Scope |
|---|---|
| `ADMIN` | System-wide management, users/settings/catalog/security overrides |
| `DOCTOR` | Visit progression, clinical decisions, prescriptions, discharge actions |
| `PHARMACIST` | Inventory operations, order dispensing, pharmacy status transitions |
| `ACCOUNTANT` | Invoice finalization, payment confirmation, billing reconciliation |
| `LAB_TECH` | Lab/imaging result lifecycle updates and release actions |

---

## Database Schema Summary

The schema is Prisma-based with key operational entities:

## `User`
- Stores identity, role, and account metadata.
- `role` drives RBAC and dashboard behavior.

## `Patient`
- Demographics and clinical flags (e.g., allergies, triage context).
- Linked to visits (`Patient` 1 -> many `Visit`).

## `Visit`
- Core clinical encounter object.
- Includes status progression (`VisitStatus`), notes JSON, bed assignment (`bedNumber`), doctor links.
- Linked to one bill (visit-level invoice) and related task/diagnostic flows.

## `Bill` (Invoice Layer)
- Financial container for a visit (`visitId`, `patientId`, totals, payment state).
- `items` JSON stores line-itemized services (ER fee, diagnostics, pharmacy, procedures).
- Supports payment status, QR status, and accountant workflows.

## `MedicationOrder`
- Pharmacy order payload for prescribed medications.
- Tracks lifecycle (`PENDING`, `DISPENSED`, `OUT_OF_STOCK`, `CLOSED`).
- Used with grouping and quantity-aware billing.

## `ServiceCatalog`
- Master pricing table for billable services (including `ER_ADMISSION_FEE`).
- Enables configurable pricing without hardcoding fee logic in endpoint code.

---

## Deployment & Operations Notes

## Required Environment Variables

At minimum, production/staging must provide:

- `DATABASE_URL`
- `DIRECT_URL`
- `DEFAULT_SECURITY_PASSWORD`
- `DEFAULT_PHARMACIST_PASSWORD`
- JWT/auth-related secrets used by token utilities (as configured in project auth libs)

If default password variables are absent, security/admin bootstrap endpoints will intentionally fail-safe.

## QR Exit Feature Integration

- Billing updates control a QR gate status field (e.g., locked/cleared workflow).
- On payment completion endpoints, bill QR status is updated so gate/security flow can permit exit.
- Logout and auth cookies are server-expired to avoid client-only token residue.

## Performance/Operational Guidance

- Use Prisma singleton only (no local `new PrismaClient()` inside API handlers).
- Maintain DB indexes for high-traffic visit/billing filters.
- Keep polling intervals conservative in production dashboards.

---

## Auditor Checklist (Quick Verification)

- [ ] `zionmed_auth_token` is `httpOnly`, `secure` (prod), `sameSite=lax`.
- [ ] Mutating API endpoints require auth and role checks.
- [ ] Only `/api/auth/login` remains intentionally unauthenticated.
- [ ] ER visit creation always seeds admission fee exactly once.
- [ ] Pharmacy totals only reflect dispensed medication quantities.
- [ ] Discharge clears bed assignment and keeps bill visible for accountant settlement.
- [ ] No sensitive `console.log` output remains in API route handlers.

