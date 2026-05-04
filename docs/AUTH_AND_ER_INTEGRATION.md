# Auth & ER Nurse / ER Doctor Integration

## Test credentials (one-go login)

| Role       | Email            | Password  | Redirect              |
|-----------|------------------|-----------|------------------------|
| **ER Nurse**  | nurse@zion.med   | `Zion@2026` (see `prisma/seed.ts`)  | `/er/mobile-tasks` (canonical ER nurse UI) |
| **ER Doctor** | doctor@zion.med  | doc123    | `/emergency/doctor` (Doctor's Control Panel) |
| **Lab Technician** | lab@zion.med | lab123 | `/lab` (Lab Dashboard) |

After running `npm run db:seed`, log in with the above. Each account is redirected to its dashboard. Permissions: only ER Nurse (and Admin) can open `/emergency/nurse`; only Doctor (and Admin) can open `/emergency/doctor`. Data sync: orders and tasks are stored in `Visit.notes` in the database, so if the Doctor adds a medication to Bed 5, it appears for the Nurse after refresh or re-login.

---

## Where User Credentials Are Stored (Real Database)

The app uses a **real PostgreSQL database** (e.g. Supabase). Auth is **not** mock-only.

| What | Where |
|------|--------|
| **Database** | PostgreSQL via Prisma. Connection: `DATABASE_URL` and `DIRECT_URL` in `.env` |
| **Users table** | Prisma model `User` → table **`users`** (see `prisma/schema.prisma`) |
| **Credentials** | `email` (unique), `password` (plain text in dev; should be hashed in production), `role` (e.g. `ER_NURSE`) |
| **Login** | `POST /api/auth/login` → reads from `prisma.user` (same DB) |
| **Seeding** | Run `npm run db:seed` → creates test users from `prisma/seed.js` (including `nurse@zion.med` / `nurse123` with role `ER_NURSE`) |

To see or edit users in the DB:

- **Prisma Studio:** `npm run db:studio` → open **User** model (maps to `users` table).
- **Supabase:** Dashboard → Table Editor → `users`.

---

## ER Nurse → Accountant (Actual Data)

When the ER Nurse admits a patient from the Bed Management UI:

1. **ER Nurse** submits "Admit to Bed N" in the side drawer.
2. Frontend calls:
   - `POST /api/intake/register` → creates **Patient** and **Visit** (ER).
   - `POST /api/er/create-case` → creates a **Bill** for that visit with **ER Admission Fee** (e.g. 50,000 IQD).
   - `PATCH /api/visits/[visitId]` → sets `chiefComplaint`, `bedNumber`.
   - `PATCH /api/patients/[patientId]` → sets `triageLevel`.
3. **Bill** is stored in the **`bills`** table (same DB), linked to the visit.
4. **Accountant** page loads `GET /api/accountant/all-bills` → reads all visits that have a bill (including ER). So the ER admission appears there as a pending invoice.

So the **actual data** passed to the Accountant is: the **Bill** row (and related visit/patient) in the database. No separate “mock” store.

---

## ER Nurse → Pharmacy (Actual Data)

- The ER Nurse UI has **“Open Pharmacy”** in the bed drawer → links to `/pharmacy`.
- **Pharmacy** shows prescriptions from **visits** (e.g. `GET /api/pharmacy/prescriptions`), which come from the same DB (e.g. `Visit.prescription` or related prescription data).
- ER admissions create a **Visit** (and optionally a **Patient**). When a **Doctor** adds a prescription to that visit, the Pharmacy sees it. So the **actual data** to Pharmacy is the same database (visits, prescriptions); the ER Nurse does not create prescriptions directly, but the visit they created is the same one the doctor and pharmacy use.

---

## Persistent Mock Auth (Fallback)

If the database is unavailable, you can still log in and use the ER Nurse UI with a **persistent mock user** stored in the browser:

- Use **“Log in as ER Nurse (Demo)”** on the login page.
- This uses a fixed ER Nurse user (e.g. `nurse@zion.med` / role `ER_NURSE`) and saves it in **localStorage** (same key as real auth: `zionmed_user`).
- The sidebar and redirect to `/emergency/nurse` behave the same.

**Important:** With mock auth, **API calls still hit the real backend**. If the DB is down, actions like “Admit to Bed” or “Save Vitals” will fail, and the Accountant/Pharmacy pages will not show new data. To **see actual data** (bills, prescriptions) in Accountant and Pharmacy, the database must be running and seeded; then log in with seeded credentials (e.g. `nurse@zion.med` / `Zion@2026` per `prisma/seed.ts`) or with the demo button when present (UI only; data still comes from DB when it’s up).

---

## Quick Test Checklist

1. **Database + seed:** `npm run db:seed` (creates users; shared temp password in `prisma/seed.ts`).
2. **Real login:** Log in with `nurse@zion.med` / temp password from seed → redirect to canonical ER routes (`/er/mobile-tasks`).
3. **Admit a patient** to a bed → then open **Accountant** (`/accountant`) and confirm the new ER bill appears.
4. **Pharmacy:** Open **Pharmacy** (`/pharmacy`); prescriptions for visits (including ER visits once a doctor prescribes) appear from the same DB.
