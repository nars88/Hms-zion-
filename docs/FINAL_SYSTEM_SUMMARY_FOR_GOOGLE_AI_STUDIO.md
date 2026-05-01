# ZION Med HMS — Final System Summary (for Google AI Studio / external AI context)

Use this document as a **single paste-in briefing** for tools like Google AI Studio: it describes what the system is, how it is built, how data and auth work, and where the main behaviors live in the codebase.

---

## 1. Product identity

**ZION Med** is a **role-based Hospital Management System (HMS)** for operational workflows: emergency care, outpatient-style visits, pharmacy, lab/radiology handoffs, billing/accounting, reception/intake, and admin configuration.

- **Stack:** Next.js (App Router), React, TypeScript, Prisma ORM, **PostgreSQL**.
- **Auth:** JWT in **httpOnly** cookie `zionmed_auth_token`; role-driven **RBAC** in middleware and per-route handlers.
- **APIs:** `src/app/api/**` (Route Handlers).

---

## 2. Core user roles (RBAC)

| Role | Typical UI / scope |
|------|---------------------|
| `ADMIN` | Admin dashboard, departments, reports, **Settings** (employees, pricing, **branding**, activity logs), service catalog |
| `DOCTOR` | Queue, consultation, prescriptions, ER doctor views, visit lifecycle |
| `PHARMACIST` | Pharmacy dispensing, inventory |
| `ACCOUNTANT` | Bills, payment confirmation, archives |
| `LAB_TECH` | Lab / ER bed result workflows |
| `RADIOLOGY_TECH` | Radiology procedures/reports |
| `RECEPTIONIST` | Reception, registration, clinic flow |
| `INTAKE_NURSE` / `ER_*` | Intake and ER nursing / vitals / tasks |
| `SECURITY` | Gate / exit checks |
| `SECRETARY` | Clinic queue |

**ADMIN** is allowed almost everywhere as a superuser in route configuration.

---

## 3. Branding & system settings

- **Model:** `SystemSettings` (table `system_settings`), singleton row id **`default`**.
- **Fields:** `system_name`, `logo_url` (stores a **site-relative path** such as `/uploads/branding/logo-….png`, not external hotlinks), `updated_by`, `updated_at`.
- **Public read:** `GET /api/system/branding` — used by login, marketing `/`, and sidebars via **`BrandingProvider`** + `useBranding()`.
- **Admin update:**
  - `PATCH /api/admin/system-settings` — system name; optional `clearLogo: true` removes DB reference and deletes managed file under `public/uploads/branding`.
  - `POST /api/admin/system-settings/logo` — **multipart** field `file`; saves image to `public/uploads/branding/`, updates `logo_url`, writes **audit log**.
- **Live refresh:** `BroadcastChannel('zion-branding')` triggers refetch so open tabs update after saves.

---

## 4. Audit / activity logs

- **Model:** `AuditLog` (table `audit_logs`) — append-only style records: user, role, action, metadata JSON, IP, user-agent, timestamp.
- **Read (ADMIN):** `GET /api/admin/audit-logs`
- **Write:** `writeAuditLog()` in `src/lib/auditLog.ts` from sensitive admin actions (employees, catalog, backup, **branding**, etc.).

---

## 5. Domain highlights (behavioral)

### Emergency / ER

- ER registration, triage, bed/task flows, doctor orders, lab/imaging loops, discharge readiness.
- Visit status enum includes workflow states such as registered / with doctor (see Prisma `VisitStatus`).
- **ER admission fee:** catalog code `ER_ADMISSION_FEE` with idempotent billing helper (`ensureErAdmissionBill` pattern).

### Pharmacy

- Medication orders linked to visits; **dispensed-only** items drive billing totals in normal rules.
- Inventory restock, out-of-stock paths, order close/dispense APIs.

### Billing / accountant

- Visit-level **Bill** with JSON line items; payment and QR-related fields for exit/gate workflows.
- Accountant confirms payments and archives as implemented in `src/app/api/accountant/*`.

### Reception / intake / secretary

- Patient search, visit registration, clinic queue, ER quick registration paths.

---

## 6. Database (Prisma)

- **Schema file:** `prisma/schema.prisma`
- **Key entities:** `User`, `Patient`, `Visit`, `Bill`, `MedicationOrder`, `ServiceCatalog`, `Inventory`, `SystemSettings`, `AuditLog`, `Departments`, emergency/task models, etc.
- **Sync:** `npx prisma db push` (dev) or `npx prisma migrate deploy` (when migrations are baselined in the environment).

---

## 7. Security model (short)

- Middleware treats `/`, `/login`, `/api/auth/login`, `/api/system/branding`, health, scanner, and static paths as **public** where configured; most `/api/*` require JWT + role rules.
- Route handlers call **`getRequestUser`** and return `401`/`403` when appropriate.
- Cookies: `httpOnly`, `secure` in production, `sameSite=lax` (see login/logout routes).

---

## 8. Frontend structure

- **App routes:** `src/app/(app)/*` (main authenticated app), `src/app/(admin)/*` (admin settings sub-routes / redirects), marketing `/` and `/login`.
- **Shared UI:** `src/components/*` — e.g. `ZionMedLogo`, `AdminContextSidebar`, role sidebars, ER/doctor/pharmacy modules.
- **Contexts:** `AuthContext`, `BrandingProvider` in root layout for global branding.

---

## 9. Environment variables (typical)

- `DATABASE_URL`, `DIRECT_URL` (Postgres; Supabase-style pooler compatible)
- Bootstrap/demo passwords and JWT secret material as used in `src/lib` auth helpers (see login and admin bootstrap routes).

---

## 10. Operational notes for AI assistants

- Prefer **reading** `prisma/schema.prisma` before inferring field names.
- Billing and pharmacy rules are **policy-sensitive**: check both API and UI (e.g. dispensed-only revenue).
- Branding assets are **local files** under `public/uploads/branding`; production deploys must persist that directory (or switch to object storage in a future iteration).
- When Prisma errors mention missing delegates (`findUnique` / `findMany` undefined), the fix is almost always: **regenerate client** (`npx prisma generate`) and **apply schema to DB** (`db push` or migrations), then **restart** the Node server.
- If **`prisma db push` times out** (common on pooled Supabase URLs), retry with **`DIRECT_URL`** as the migration/push URL, run during low traffic, or apply the SQL for `system_settings` / `audit_logs` from the repo migrations manually in the SQL editor.
- **ER diagnostic “View Full Attachment”:** URLs are validated (`isNavigableAttachmentUrl`) before `window.open` so invalid paths or unsafe schemes do not open an empty tab; popup blockers still fall back to the in-app overlay (`ERDoctorClinicView.tsx`).

---

## 11. Related internal doc

- `SYSTEM_DOCUMENTATION.md` — deeper workflow notes (ER fee, pharmacy grouping, discharge, security checklist).

---

*Generated for handoff to Google AI Studio and similar tools. Adjust deployment-specific details (hosting, secrets, migration baseline) per environment.*
