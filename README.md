# Zion Med - Hospital Management System

A premium, modern Hospital Management System built with Next.js, Prisma, and PostgreSQL.

## Features

- **Multi-role User Management**: ADMIN, DOCTOR, RECEPTION, PHARMACIST, ACCOUNTANT, SECURITY
- **Patient Management**: Complete patient profiles and medical history
- **AI-Powered Triage**: Intelligent symptom analysis
- **Visit Management**: Track patient visits from check-in to discharge
- **Billing System**: QR-based billing with payment tracking
- **Exit Pass System**: QR-based exit verification
- **Dark Mode UI**: Professional Dark Navy/Charcoal theme

## Tech Stack

- **Framework**: Next.js 14
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database (configured via Supabase)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
   - Create a `.env` file in the root directory
   - Add your database connection strings (see `.env.example` for reference)

3. Set up the database:
```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Or run migrations
npm run db:migrate
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

The system includes the following main models:

- **User**: System users with role-based access
- **Patient**: Patient profiles and medical history
- **Triage**: AI-powered symptom analysis and priority assessment
- **Visit**: Patient visit tracking with status management
- **Bill**: QR-based billing system
- **ExitPass**: QR-based exit verification

## Environment Variables

Required environment variables:

- `DATABASE_URL`: PostgreSQL connection string (pooler)
- `DIRECT_URL`: Direct PostgreSQL connection (for migrations)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma Client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed test users (ER Nurse: `nurse@zion.med` / `nurse123` → `/emergency/nurse`; ER Doctor: `doctor@zion.med` / `doc123` → `/emergency/doctor`)

## Auth & Test Accounts

- **Credentials** are stored in the **database** (PostgreSQL). Table: `users`. Login: `POST /api/auth/login`.
- **Run `npm run db:seed`** to create test users. Then log in with:
  - **ER Doctor:** `doctor@zion.med` / `doc123` → redirects to `/emergency/doctor`
  - **ER Nurse:** `nurse@zion.med` / `nurse123` → redirects to `/emergency/nurse`
  - **Admin:** `admin@zionmed.com` / `admin123` → `/admin/dashboard`
- **ER Nurse → Accountant:** Admitting a patient creates a **Bill** (ER Admission Fee).
- **ER Nurse → Pharmacy:** Pharmacy shows prescriptions from visits in the same DB.

See **[docs/AUTH_AND_ER_INTEGRATION.md](docs/AUTH_AND_ER_INTEGRATION.md)** for details.

## License

Private - All rights reserved

