# NARS Hospital — Final Session Lockdown & Handover

**Former product name:** ZION Med  
**Current identity:** **NARS Hospital**  
**Repository state:** All RBAC, financial, token-versioning, audit, and UI lockdown logic is **committed on `main`** (see git history: `7e06f48`, `62258e8`, and related `feat(handover): …` baseline). Working tree intended to be **clean** before production deploy.

---

## 1. Identity & branding

- **Name:** `SystemSettings.systemName` defaults to **“NARS Hospital”** in PostgreSQL (`prisma/schema.prisma`).
- **Logo:** Administrators upload a **local** logo via **`POST /api/admin/system-settings/logo`** (multipart). Files are stored under **`public/uploads/branding/`**; **`logoUrl`** holds an on-site path (not an external hotlink).
- **Supporting code:** `src/lib/brandingConstants.ts`, `src/lib/brandingStorage.ts`, `src/app/api/admin/system-settings/route.ts` and `logo/route.ts`, plus branding context in the UI.

---

## 2. Clinical privacy (audit-aligned)

**Explicit confirmation:** **`ADMIN`** and **`ACCOUNTANT`** are **blocked from reading and writing clinical content** (notes, diagnoses, prescriptions, ER medical summaries, unredacted visits, etc.) on the hardened API surface.

- **`src/lib/rbacClinical.ts`** — `isClinicalAccessAllowed()`, `forbiddenClinicalAccess()` → **403** + **`AuditLog`** entry **`UNAUTHORIZED_ACCESS_ATTEMPT`** (metadata includes **`severity: 'HIGH'`** where applicable).
- **Examples:** `GET/PATCH /api/visits/[visitId]` (clinical fields), **`/api/doctor/*`** clinical endpoints, **`GET /api/emergency/visit-summary`**, pharmacy prescription endpoints (**`PHARMACIST`** only), **`GET /api/admin/backup`** visit redaction.
- **Doctor-only clinical UX:** **`/doctor`** and **`/intake`** pages exclude **`ADMIN`** in **`middleware`**; doctor app pages use **`ProtectedRoute`** for **`DOCTOR`** only; sidebar hides clinical nav for finance/admin mirror roles; **`MedicalRecordModal`** uses **`RestrictedClinicalView`** for restricted roles.
- **Exception (metadata only):** Some **`/api/doctor/visit/*`** actions that only adjust **visit metadata** (e.g. start / send-to-diagnostics) may still allow **`ADMIN`** per operational policy — **not** clinical note/diagnosis access.

**Audit logs** for the viewer are **read-only** (`GET /api/admin/audit-logs` only); **no** PATCH/DELETE on `AuditLog` — append-only via **`writeAuditLog`**.

---

## 3. Financial integrity

### Paid invoices

- Only **`ACCOUNTANT`** may transition bills to **Paid** on **`POST /api/accountant/confirm-payment`** and **`POST /api/billing/invoices/[id]/pay`**.
- **`ADMIN`** is **explicitly denied** ( **`forbiddenPaymentFinalize`** → **403** + audit **`FinancialAction`** ).
- Successful payment path uses **`prisma.$transaction`** and **`writeAuditLogTx`** with **`PAYMENT_FINALIZED`** for **atomic** bill update + audit.

### ER admission fee (10,000 IQD baseline)

Protection is **enforced in the application and catalog layer** (bill line items remain **JSON**, so a single-row **SQL unique constraint on “serviceCode per bill”** is not modeled as a second table):

- **Catalog floor:** **`ER_ADMISSION_FEE`** cannot be priced **below 10,000 IQD** on **POST/PATCH** service catalog; violations return **400** and **`AuditLog`** (**`ER_ADMISSION_FEE_POLICY_VIOLATION`**, **HIGH**). The catalog row **cannot be deleted**.
- **Invoice sync:** **`POST /api/billing/invoice/sync`** rejects **more than one** ER admission line per bill (`countErAdmissionBillItems` in **`src/lib/billing/erAdmission.ts`**).
- **Constants:** `DEFAULT_ER_ADMISSION_FEE`, `MIN_ER_ADMISSION_CATALOG_IQD`, `ER_ADMISSION_SERVICE_CODE` in **`src/lib/billing/erAdmission.ts`**.
- **Schema note:** `Bill.items` documented in Prisma as JSON with **at-most-one** ER admission line enforced in **API**.

---

## 4. Security architecture

### Token versioning (session revocation)

- **`User.authTokenVersion`** (column **`auth_token_version`**) — see **`scripts/apply-auth-token-version.sql`** if migrations are not checked in.
- **JWT** carries **`tokenVersion`** minted at **login**; **`getRequestUser`** (`src/lib/apiAuth.ts`) **must** match DB version or return **`null`** → callers use **`unauthorized()` (401)**.
- **Logout** increments **`authTokenVersion`** so prior tokens **fail API auth** immediately.
- **Note:** **Page** middleware still validates JWT **signature/expiry** only; **API** routes enforce **version** binding.

### Audit inside transactions

- **`writeAuditLogTx`** (`src/lib/auditLog.ts`) writes **`AuditLog`** inside **`prisma.$transaction`** with payment finalization so financial state and audit trail **commit together**.

---

## 5. Data & UI

### Live admin dashboard (UTC)

- **`GET /api/admin/dashboard`** aggregates **visits** and **bills** from **PostgreSQL via Prisma** (no mock KPI source on that path).
- **Date bucketing** for “today” and monthly series uses **UTC** helpers (`todayBoundsUtc`, `monthBoundsUtc` in `src/app/api/admin/dashboard/route.ts`).

### `about:blank` attachment guard

- **`src/components/emergency/ERDoctorClinicView.tsx`** treats **`about:blank`** URLs as **invalid** attachment targets so blank pages are not shown as real clinical media.

---

## Deploy checklist (short)

1. **PostgreSQL:** apply **`scripts/apply-auth-token-version.sql`** if `auth_token_version` is missing.  
2. **`npx prisma generate`** (and **`migrate deploy`** / **`db push`** per your process).  
3. **Env:** `DATABASE_URL`, `JWT_SECRET`, production **`NODE_ENV`**.  
4. **Optional:** `git push origin main` to publish the **4 commits** currently ahead of `origin` (verify with `git status`).

---

*This document closes the final sync for NARS Hospital HMS handover (formerly ZION Med).*
