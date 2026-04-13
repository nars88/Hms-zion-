# Setup Instructions

## Environment Variables

Since `.env` files are protected, please create a `.env` file manually in the root directory with the following content:

```env
# Database Configuration
# Pooler connection (for general queries)
DATABASE_URL="postgresql://postgres.opjbkeiirrycpitkoyhz:Y8TF500OKK7MM@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection (for migrations and schema operations)
DIRECT_URL="postgresql://postgres.opjbkeiirrycpitkoyhz:Y8TF500OKK7MM@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"
```

## Next Steps

1. **Create the `.env` file** with the content above
2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Generate Prisma Client**:
   ```bash
   npm run db:generate
   ```

4. **Push the schema to your database**:
   ```bash
   npm run db:push
   ```

5. **Start the development server**:
   ```bash
   npm run dev
   ```

## Database Schema Overview

Your Prisma schema includes:

- **User**: 6 roles (ADMIN, DOCTOR, RECEPTION, PHARMACIST, ACCOUNTANT, SECURITY)
- **Patient**: Complete profile with medical history
- **Triage**: AI symptom analysis with priority levels
- **Visit**: Status tracking (Waiting, In_Consultation, Billing, Discharged)
- **Bill**: QR-based billing system
- **ExitPass**: QR-based exit verification

## UI Theme

The project is configured with a professional Dark Mode theme:
- Primary: Dark Navy (#0f1629)
- Secondary: Dark Navy (#1a2641)
- Accent colors: Blue, Green, Red, Yellow, Purple
- All components use the dark theme by default

