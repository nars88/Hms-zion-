# 🏥 Zion Med — Hospital Management System

 A premium, full-stack Hospital Management System built to digitize clinical workflows — from AI-powered triage to QR-based billing and exit verification.

🔗 **Live Demo:** hms-zion.vercel.app

---

## Overview

Zion Med is a production-grade system designed for real hospital environments. It handles multi-role staff access, patient lifecycle management, intelligent triage, and a complete billing pipeline — all in one unified platform.

Built with a modern TypeScript stack, it supports 6 distinct user roles working simultaneously across different departments.

---

## ✨ Key Features

- **Multi-Role Access Control** — 6 roles: Admin, Doctor, Receptionist, Pharmacist, Accountant, Security
- **AI-Powered Triage** — Intelligent symptom analysis to prioritize patient care
- **Patient Management** — Complete profiles, medical history, and visit tracking
- **QR-Based Billing** — Generate and scan QR codes for fast payment processing
- **Exit Pass System** — QR-based exit verification for patient discharge
- **ER Integration** — Admitting a patient automatically creates a bill and notifies pharmacy
- **Dark Mode UI** — Professional Dark Navy/Charcoal theme built for long clinical shifts

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Styling | Tailwind CSS |
| Deployment | Vercel |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase recommended)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/zion-med.git
cd zion-med

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in your DATABASE_URL and DIRECT_URL in .env

# 4. Set up the database
npm run db:generate   # Generate Prisma Client
npm run db:push       # Push schema to database

# 5. Seed test users
npm run db:seed

# 6. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👤 Test Accounts

After running `npm run db:seed`, the following accounts are available:

| Role | Email |
|---|---|
| Admin | admin@zionmed.com |
| ER Doctor | doctor@zion.med |
| ER Nurse | nurse@zion.med |

> **Password:** See `NARS_SEED_TEMP_PASSWORD` in `prisma/seed.ts`

---

## 🗄 Database Schema

| Model | Description |
|---|---|
| `User` | Staff accounts with role-based access |
| `Patient` | Patient profiles and medical history |
| `Triage` | AI-powered symptom analysis and priority scoring |
| `Visit` | Full visit lifecycle from check-in to discharge |
| `Bill` | QR-based billing and payment tracking |
| `ExitPass` | QR-based exit verification on discharge |

---

## 📜 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run db:generate  # Generate Prisma Client
npm run db:push      # Push schema changes
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio (visual DB browser)
npm run db:seed      # Seed test users
```

---

## 🔐 Environment Variables

Create a `.env` file based on `.env.example`:

```
DATABASE_URL=       # PostgreSQL connection string (pooler)
DIRECT_URL=         # Direct PostgreSQL connection (for migrations)
```

---

## 📁 Project Structure

```
zion-med/
├── app/               # Next.js App Router pages
├── components/        # Reusable UI components
├── prisma/
│   ├── schema.prisma  # Database schema
│   └── seed.ts        # Test data seeder
├── lib/               # Utilities and helpers
├── docs/              # Additional documentation
└── public/            # Static assets
```

---

## 📄 License

Private — All rights reserved © 2026 Zion Med

