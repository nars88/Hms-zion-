# NARS Hospital — Test Credentials

**Source of truth:** `prisma/seed.ts` — constant **`NARS_SEED_TEMP_PASSWORD`** (default **`Zion@2026`**) applies to **every** seeded user after `npm run db:seed`.

## Default Test Accounts (abbreviated)

| Role | Example email | Password | Notes |
|------|---------------|----------|--------|
| **Admin** | `admin@zionmed.com` | `Zion@2026` | See full list in `prisma/seed.ts` (`SEED_USERS`) |
| **Receptionist** | `reception@zionmed.com` | `Zion@2026` | |
| **Intake Nurse** | `intake@zionmed.com` | `Zion@2026` | |
| **Doctor** | `doctor@zionmed.com` | `Zion@2026` | |
| **Pharmacist** | `pharmacy@zion.com` | `Zion@2026` | |
| **Accountant** | `accountant@zionmed.com` | `Zion@2026` | |

---

## Quick Reference by Testing Scenario

### Scenario A: Routine Clinic Patient Flow
1. **Receptionist** → `reception@zionmed.com` / `Zion@2026`
2. **Intake Nurse** → `intake@zionmed.com` / `Zion@2026`
3. **Doctor** → `doctor@zionmed.com` / `Zion@2026`
4. **Pharmacist** → `pharmacy@zion.com` / `Zion@2026`
5. **Accountant** → `accountant@zionmed.com` / `Zion@2026`

### Scenario B: Critical ER Patient Flow
1. **Receptionist** → `reception@zionmed.com` / `Zion@2026`
2. **Intake Nurse** → `intake@zionmed.com` / `Zion@2026`
3. **Doctor** → `doctor@zionmed.com` / `Zion@2026`
4. **Pharmacist** → `pharmacy@zion.com` / `Zion@2026`
5. **Accountant** → `accountant@zionmed.com` / `Zion@2026`

---

## Additional Roles (If Needed)

| Role | Email | Password |
|------|-------|----------|
| **ER Nurse** | `ernurse@zionmed.com` | `Zion@2026` |
| **Secretary** | `secretary@zionmed.com` | `Zion@2026` |
| **Security** | `security@zionmed.com` | `Zion@2026` |
| **Lab Tech** | `lab@zion.com` | `Zion@2026` |

---

## Database Setup Instructions

### Option 1: Using Seed Script (Recommended)

Run the seed script to automatically create all test users:

```bash
npm run db:seed
```

Runs `npx tsx prisma/seed.ts` (see `package.json` → `prisma.seed`).

**✅ All test users have been created successfully!**

### Option 2: Using Prisma Studio

1. Open Prisma Studio:
   ```bash
   npm run db:studio
   ```
2. Navigate to the `User` model
3. Click "Add record" and manually create each user

### Option 3: Using SQL Commands

Run these SQL commands directly in your database:

```sql
-- Admin
INSERT INTO users (id, email, password, name, role, "createdAt", "updatedAt")
VALUES ('admin-001', 'admin@zionmed.com', 'admin123', 'System Administrator', 'ADMIN', NOW(), NOW());

-- Receptionist
INSERT INTO users (id, email, password, name, role, "createdAt", "updatedAt")
VALUES ('reception-001', 'reception@zionmed.com', 'reception123', 'Reception Staff', 'RECEPTIONIST', NOW(), NOW());

-- Intake Nurse
INSERT INTO users (id, email, password, name, role, "createdAt", "updatedAt")
VALUES ('intake-001', 'intake@zionmed.com', 'intake123', 'Intake Nurse', 'INTAKE_NURSE', NOW(), NOW());

-- Doctor
INSERT INTO users (id, email, password, name, role, "createdAt", "updatedAt")
VALUES ('doctor-001', 'doctor@zionmed.com', 'doctor123', 'Dr. Sarah Smith', 'DOCTOR', NOW(), NOW());

-- Pharmacist
INSERT INTO users (id, email, password, name, role, "createdAt", "updatedAt")
VALUES ('pharmacy-001', 'pharmacy@zionmed.com', 'pharmacy123', 'Senior Pharmacist', 'PHARMACIST', NOW(), NOW());

-- Accountant
INSERT INTO users (id, email, password, name, role, "createdAt", "updatedAt")
VALUES ('accountant-001', 'accountant@zionmed.com', 'accountant123', 'Hospital Accountant', 'ACCOUNTANT', NOW(), NOW());
```

---

## Security Note

⚠️ **These are test credentials for development only.**

In production:
- Use strong, unique passwords
- Implement password hashing (bcrypt)
- Enable two-factor authentication (2FA)
- Regularly rotate passwords
- Use secure session management

---

## Troubleshooting

If login fails:
1. Verify the user exists in the database
2. Check that email matches exactly (case-insensitive)
3. Ensure password is stored correctly
4. Check browser console for errors
5. Verify API endpoint `/api/auth/login` is accessible

---

**Last Updated**: 2024  
**System**: ZION Hospital Management System v1.0

