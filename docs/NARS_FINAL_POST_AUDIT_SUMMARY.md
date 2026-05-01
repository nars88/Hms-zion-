# NARS Hospital — Final Post-Audit Summary

**Product:** NARS Hospital HMS (Next.js, Prisma, PostgreSQL)  
**Audit focus:** Identity & branding, clinical privacy walls, financial integrity, database truth, session security.

---

## 1. Identity & branding (ZION → NARS)

- **System name:** `SystemSettings` in PostgreSQL defaults to **“NARS Hospital”** (`prisma/schema.prisma` → `SystemSettings.systemName`).
- **Desktop / app logo:** Admins upload a logo via **`POST /api/admin/system-settings/logo`** (multipart file). Files are stored under **`public/uploads/branding/`**; **`logoUrl`** on `SystemSettings` holds a site path (e.g. `/uploads/branding/logo-….png`), not a hotlinked URL.
- **Supporting modules:** `src/lib/brandingConstants.ts`, `src/lib/brandingStorage.ts`, `src/app/api/admin/system-settings/route.ts` (and logo route).
- **UI:** Sidebars and branding contexts read live settings so the product presents as **NARS Hospital** once configured.

---

## 2. Clinical privacy (admin / accountant segregation)

**Policy:** Users in **`ADMIN`** and **`ACCOUNTANT`** roles must not read or write clinical content (notes, diagnoses, prescriptions, ER medical summaries, etc.) through the protected APIs.

**Implementation (hard-coded):**

- **`src/lib/rbacClinical.ts`** — `isClinicalAccessAllowed()`, `forbiddenClinicalAccess()` (403 + audit).
- **Examples:**
  - **`GET /api/visits/[visitId]`** — authenticated; **ADMIN/ACCOUNTANT** → **403** + **`UNAUTHORIZED_ACCESS_ATTEMPT`** in `AuditLog`.
  - **`PATCH /api/visits/[visitId]`** — clinical staff may update clinical fields; **ADMIN/ACCOUNTANT** limited to **visit metadata** (e.g. status, bed); clinical field attempts → **403** + audit.
  - **`PATCH /api/patients/[patientId]`** — **ADMIN** removed from triage/allergies updates (clinical staff only).
  - **`/api/doctor/*`** — queue, completed cases, visit close, send-to-pharmacy, complete-case: **ADMIN** blocked with audit; **metadata-only** exceptions remain for **`visit/start`** and **`send-to-diagnostics`** (status / billing workflow).
  - **`GET /api/emergency/visit-summary`** — auth + same clinical gate.
  - **Pharmacy prescription lists** — **`GET /api/pharmacy/prescriptions`** and **`GET .../allergies`** restricted to **`PHARMACIST`**.
- **Accountant billing:** **`GET /api/accountant/all-bills`** — **ADMIN** path does **not** query **`medicationOrders`** (avoids med-order exposure while keeping finance views).
- **Admin backup export:** **`GET /api/admin/backup`** — visit rows are **redacted** (no `chiefComplaint`, `diagnosis`, `prescription`, `notes` in export).
- **UI:** **`SmartSidebar`** hides **`/intake`** and **`/doctor`** for **ADMIN/ACCOUNTANT**; **`MedicalRecordModal`** shows **“Privacy Restricted”** for clinical blocks; doctor pages use **`ProtectedRoute`** for **`DOCTOR`** only; **`middleware`** no longer grants **ADMIN** access to **`/doctor`** or **`/intake`** pages.

**Note:** Middleware still validates JWT signature/expiry for **page** routing; **API** enforcement (including clinical RBAC and session version check) is on route handlers via **`getRequestUser`**.

---

## 3. Financial integrity

### 3.1 Paid invoices — accountant only

- **`POST /api/accountant/confirm-payment`** and **`POST /api/billing/invoices/[id]/pay`** — only **`ACCOUNTANT`** may set bills to **Paid** / clear QR.
- **`ADMIN`** receives **403** + **`UNAUTHORIZED_ACCESS_ATTEMPT`** with entity **`FinancialAction`** (`forbiddenPaymentFinalize` in `rbacClinical.ts`).
- Successful payment updates run inside **`prisma.$transaction`** with an **`AuditLog`** row via **`writeAuditLogTx`** (`action: PAYMENT_FINALIZED`) for non-repudiation.
- **UI:** **`MedicalReceipt`** / accountant dashboard — **Confirm Payment** only when **`user.role === ACCOUNTANT`**.

### 3.2 ER admission fee (10,000 IQD baseline)

- **Service code:** `ER_ADMISSION_FEE` in **`src/lib/billing/erAdmission.ts`** with **`DEFAULT_ER_ADMISSION_FEE = 10_000`** IQD when no catalog row applies.
- **Billing integrity:** **`POST /api/billing/invoice/sync`** — non-admin callers cannot alter the **ER Admission Fee** line once locked (marker **`ER Admission Fee`** / comparison logic in sync route).
- **Removal protection:** **`POST /api/billing/invoice/remove-item`** — guards against removing the admission fee line inappropriately (same marker pattern).
- **Catalog:** Admin service-catalog routes treat **`ER_ADMISSION_SERVICE_CODE`** as a protected service definition.

---

## 4. Database sync & live dashboard

- **PostgreSQL** is the system of record (`DATABASE_URL` / `DIRECT_URL` in `.env`).
- **`SystemSettings`** and **`AuditLog`** are first-class models in **`prisma/schema.prisma`** and map to **`system_settings`** and **`audit_logs`**.
- **Admin dashboard API** (`GET /api/admin/dashboard`) aggregates **visits** and **bills** via **Prisma** against PostgreSQL (real-time per request; no mock aggregates in that path).
- **After schema changes:** run **`npx prisma migrate deploy`** (or **`migrate dev`** in development) so production matches the repo — including the **`auth_token_version`** migration below.

---

## 5. Session security

### 5.1 Token versioning (instant API revocation)

- **`User.authTokenVersion`** (column **`auth_token_version`**, default **0**) stores a monotonic counter.
- **JWT** payload includes **`tokenVersion`**, minted on **login** to match the DB value (`src/lib/jwt.ts`, `src/app/api/auth/login/route.ts`).
- **`getRequestUser`** (`src/lib/apiAuth.ts`) verifies the JWT, then loads **`authTokenVersion`** for that user; **mismatch → `null`** (callers treat as unauthorized).
- **Logout** (`src/app/api/auth/logout/route.ts`) **increments** **`authTokenVersion`** after validating the token, then clears cookies — all **previous** tokens for that user fail API auth immediately.
- **SQL (PostgreSQL):** run **`scripts/apply-auth-token-version.sql`** if the `users` table does not yet have **`auth_token_version`** (a copy also exists under `prisma/migrations/20260502120000_user_auth_token_version/` locally when migrations are generated).

**Deploy checklist:** apply the column change + run **`npx prisma generate`** on the build host so the Prisma client includes `authTokenVersion`.

### 5.2 `about:blank` attachment handling (ER UI)

- **`src/components/emergency/ERDoctorClinicView.tsx`** — attachment URLs matching **`about:blank`** are rejected / ignored so blank targets are not treated as real clinical media links.

---

## Repository touchpoints (quick index)

| Area | Location |
|------|----------|
| Clinical RBAC + payment audit helpers | `src/lib/rbacClinical.ts`, `src/lib/auditLog.ts` |
| Session / JWT | `src/lib/jwt.ts`, `src/lib/apiAuth.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts` |
| Branding | `src/app/api/admin/system-settings/logo/route.ts`, `src/lib/brandingStorage.ts` |
| ER admission & fee defaults | `src/lib/billing/erAdmission.ts` |
| Schema | `prisma/schema.prisma`, `prisma/migrations/` |

---

*Generated for NARS Hospital project audit closure. Commit containing these controls should be tagged in git history as the post-audit security baseline.*
