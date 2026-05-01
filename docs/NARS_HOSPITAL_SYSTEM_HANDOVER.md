# NARS Hospital — System Architecture & Audit Handover

**Document type:** Final technical handover for operational and compliance audit.  
**Product identity:** **NARS Hospital** (Hospital Management System).  
**Codebase:** Next.js (App Router) application with PostgreSQL (Prisma ORM).

---

## 1. Project identity

| Item | Detail |
|------|--------|
| **Commercial / clinical name** | **NARS Hospital** |
| **Core stack** | **Next.js 16**, **React 19**, **TypeScript**, **Prisma 6**, **PostgreSQL** (e.g. Supabase-hosted) |
| **Dynamic branding** | Singleton row in **`system_settings`** (`SystemSettings` model, id `default`): **`system_name`**, **`logo_url`** (site-relative path under `public/uploads/branding/`, not hotlinked URLs). |
| **Public read** | `GET /api/system/branding` — used by login, marketing landing, and staff chrome. |
| **Admin update** | `PATCH /api/admin/system-settings` (name / clear logo), `POST /api/admin/system-settings/logo` (multipart file upload). |
| **Live UI sync** | `BrandingProvider` + `BroadcastChannel` so open tabs refetch after saves. |
| **Defaults** | `DEFAULT_SYSTEM_NAME` in code and schema defaults set to **NARS Hospital**; production display name should be confirmed in **Admin → Settings → Branding & Identity** after DB seed/sync. |

---

## 2. Security framework

### 2.1 Authentication

- **Mechanism:** Signed **JWT** stored in **`httpOnly`** cookie **`zionmed_auth_token`**.
- **Lifecycle:** Issued on login; cleared on logout; middleware enforces presence for protected routes and APIs (with defined public exceptions, e.g. `/`, `/login`, `/api/auth/login`, `/api/system/branding`, health checks).

### 2.2 Role-based access control (RBAC)

- **Enforcement layers:** (1) **Middleware** — JWT verification and coarse rules (e.g. `/api/admin/*` and `/api/employees/*` require **ADMIN** for all methods). (2) **Route handlers** — `getRequestUser()` + explicit `401` / `403` for sensitive operations.
- **Primary roles (non-exhaustive):** `ADMIN`, `DOCTOR`, `PHARMACIST`, `ACCOUNTANT`, `LAB_TECH`, `RADIOLOGY_TECH`, `RECEPTIONIST`, `INTAKE_NURSE`, ER nursing variants, `SECURITY`, `SECRETARY`, etc. **ADMIN** is treated as a superuser across most route prefixes.
- **Admin surface:** Dedicated **`/admin`** layout with **ADMIN-only** `ProtectedRoute`.

### 2.3 “Tag-based” permissions

The codebase does **not** implement a separate ACL tag table. **Effective permissions are role labels embedded in the JWT** and **URL-prefix rules** in middleware plus per-handler checks. For audit language: treat **role = permission tag** at the API boundary (e.g. only `ADMIN` may call `/api/admin/*`).

---

## 3. Business logic (selected)

### 3.1 ER admission fee protection (~**10,000 IQD**)

- **Service code:** `ER_ADMISSION_FEE` (see `src/lib/billing/erAdmission.ts`).
- **Behavior:** On ER visit creation paths, the system **idempotently** ensures a bill line / admission fee is applied **once per visit** (guards against double charge on retry/refresh).
- **Amount:** Resolved from **`ServiceCatalog`** when present; otherwise **`DEFAULT_ER_ADMISSION_FEE` = 10_000** (IQD in product convention).

### 3.2 QR code exit feature

- **Billing / visit** records carry **QR-related fields** (e.g. on **`Bill`**: `qrCode`, `qrStatus` such as **LOCKED** until settlement).
- **Security / gate:** **`/api/security/check/[patientId]`** and related flows validate exit eligibility against billing/QR state after payment workflows (accountant confirmation updates payment status).
- **Operational intent:** Exit is **gated** until financial clearance rules are satisfied, with QR as the machine-readable artifact for security staff.

---

## 4. Data integrity & observability

### 4.1 Live admin dashboard (UTC)

- **Endpoint:** `GET /api/admin/dashboard` (**ADMIN** only).
- **Sources:** **`Visit`** (`visitDate` for monthly/today counts), **`Bill`** (`createdAt` for bill volume; **`total`** sum for **Paid** / **COMPLETED** revenue attributed by **`paidAt`** or **`updatedAt`** when `paidAt` is null).
- **Charts:** Last **six calendar months** (UTC boundaries). **No mock series** in the admin dashboard UI for these charts after handover.
- **Refresh:** Full page reload or **Refresh stats** triggers a new read — **not** a push/WebSocket stream.

### 4.2 Audit logging (admin actions)

- **Model:** **`AuditLog`** → table **`audit_logs`** (append-only style).
- **Write path:** `writeAuditLog()` in `src/lib/auditLog.ts` (best-effort; does not block primary business flow on failure).
- **Read path:** `GET /api/admin/audit-logs` (**ADMIN**).
- **Examples:** Service catalog changes, employee changes, backups, **branding** updates (name/logo/clear), etc.

### 4.3 Operational DB sync (Supabase / pooler)

- **`prisma db push`** may **time out** on pooled hosts during heavy DDL (e.g. `DROP INDEX`).
- **Mitigation in repo:** `npm run db:push:direct` (uses `PRISMA_DB_PUSH_URL` / direct rules) and **`npm run db:sync:admin-tables`** for idempotent **`system_settings`** + **`audit_logs`** creation via `scripts/sql/sync-system-settings-audit-log.sql`.

---

## 5. Bug-fix confirmation (handover)

| Issue | Resolution |
|-------|------------|
| **Activity logs / `findMany` on undefined** | **`AuditLog`** in Prisma schema; table created via migrations/sync script; **`GET /api/admin/audit-logs`** uses **`prisma.auditLog.findMany`** with **`runtime = 'nodejs'`** and delegate guard where applicable. |
| **Branding `findUnique` / missing `SystemSettings`** | Same as above for **`system_settings`**; APIs guard missing Prisma delegate; branding uses **file upload** to **`public/uploads/branding`**. |
| **“View Full Attachment” blank tab** | **`ERDoctorClinicView`**: **`isNavigableAttachmentUrl()`** + stricter **`resolveAttachmentUrl()`** so **`window.open`** is not called with invalid/unsafe URLs; popup block falls back to overlay. |

---

## 6. Repository & continuity

- **Environment:** `DATABASE_URL`, `DIRECT_URL`, `PRISMA_DB_PUSH_URL` (session pooler for CLI DDL where needed), `JWT_SECRET`, bootstrap passwords per project policy.
- **Do not commit:** `.env` (listed in `.gitignore`); uploaded logos under `public/uploads/branding/*` are gitignored except **`.gitkeep`**.

---

## 7. Sign-off checklist for auditors

- [ ] **`system_settings`** row exists with **`system_name`** = **NARS Hospital** (or desired legal name) and optional **`logo_url`** path after branding upload.
- [ ] **`audit_logs`** table present; sample entries after admin actions.
- [ ] Admin dashboard figures reconcile with SQL counts on **`visits`** / **`bills`** for the same UTC month.
- [ ] ER admission fee line appears **once** per new ER visit in billing smoke test.
- [ ] Exit / security check rejects unpaid or locked-QR scenarios per policy.

---

*Prepared for **NARS Hospital** final audit and operational handover.*
