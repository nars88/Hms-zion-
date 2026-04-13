# ZION Med - Test Credentials

## Default Test Accounts

Use these credentials to test each role in the ZION Hospital Management System.

| Role | Email | Password | Dashboard URL | Access Level |
|------|-------|----------|---------------|--------------|
| **Admin** | `admin@zionmed.com` | `admin123` | `/admin` | Full system access - All modules, employee management, system settings |
| **Receptionist** | `reception@zionmed.com` | `reception123` | `/reception` | Patient registration, billing overview, intake coordination |
| **Intake Nurse** | `intake@zionmed.com` | `intake123` | `/intake` | Patient registration, vitals entry, triage level assignment |
| **Doctor** | `doctor@zionmed.com` | `doctor123` | `/doctor` | Patient consultation, diagnosis, prescription, lab orders |
| **Pharmacist** | `pharmacy@zionmed.com` | `pharmacy123` | `/pharmacy` | Prescription queue, medication dispensing, allergy safety checks |
| **Accountant** | `accountant@zionmed.com` | `accountant123` | `/accountant` | Invoice management, payment processing, QR status control |

---

## Quick Reference by Testing Scenario

### Scenario A: Routine Clinic Patient Flow
1. **Receptionist** → Register patient
   - Email: `reception@zionmed.com`
   - Password: `reception123`

2. **Intake Nurse** → Record vitals (Triage 4-5)
   - Email: `intake@zionmed.com`
   - Password: `intake123`

3. **Doctor** → Consult and prescribe
   - Email: `doctor@zionmed.com`
   - Password: `doctor123`

4. **Pharmacist** → Dispense medication
   - Email: `pharmacy@zionmed.com`
   - Password: `pharmacy123`

5. **Accountant** → Process payment
   - Email: `accountant@zionmed.com`
   - Password: `accountant123`

### Scenario B: Critical ER Patient Flow
1. **Receptionist** → Register ER patient
   - Email: `reception@zionmed.com`
   - Password: `reception123`

2. **Intake Nurse** → Record critical vitals (Triage 1-2)
   - Email: `intake@zionmed.com`
   - Password: `intake123`

3. **Doctor** → See flashing red alert, diagnose
   - Email: `doctor@zionmed.com`
   - Password: `doctor123`

4. **Pharmacist** → Test allergy conflict alert
   - Email: `pharmacy@zionmed.com`
   - Password: `pharmacy123`

5. **Accountant** → View invoice (privacy check)
   - Email: `accountant@zionmed.com`
   - Password: `accountant123`

---

## Additional Roles (If Needed)

| Role | Email | Password | Dashboard URL |
|------|-------|----------|---------------|
| **ER Nurse** | `ernurse@zionmed.com` | `ernurse123` | `/doctor` |
| **Secretary** | `secretary@zionmed.com` | `secretary123` | `/doctor` |
| **Security** | `security@zionmed.com` | `security123` | `/security` |
| **Lab Tech** | `lab@zionmed.com` | `lab123` | `/lab` |

---

## Database Setup Instructions

### Option 1: Using Seed Script (Recommended)

Run the seed script to automatically create all test users:

```bash
# Run the seed script (uses Node.js directly, no additional dependencies needed)
npm run db:seed
```

Or run directly:
```bash
node prisma/seed.js
```

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

