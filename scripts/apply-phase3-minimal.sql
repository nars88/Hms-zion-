-- Minimal non-destructive Phase 3 SQL bootstrap

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmergencyTaskType') THEN
    CREATE TYPE "EmergencyTaskType" AS ENUM ('NURSE_TASK', 'MED_ORDER');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmergencyTaskStatus') THEN
    CREATE TYPE "EmergencyTaskStatus" AS ENUM ('PENDING', 'COMPLETED');
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmergencyTaskStatus') THEN
    ALTER TYPE "EmergencyTaskStatus" ADD VALUE IF NOT EXISTS 'CREATED';
    ALTER TYPE "EmergencyTaskStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
    ALTER TYPE "EmergencyTaskStatus" ADD VALUE IF NOT EXISTS 'RELEASED';
    ALTER TYPE "EmergencyTaskStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmergencyTaskCategory') THEN
    CREATE TYPE "EmergencyTaskCategory" AS ENUM (
      'NURSING',
      'DIAGNOSTIC_LAB',
      'DIAGNOSTIC_RADIOLOGY',
      'DIAGNOSTIC_SONAR',
      'DIAGNOSTIC_ECG',
      'BED_USAGE'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'EmergencyTaskBillingStatus') THEN
    CREATE TYPE "EmergencyTaskBillingStatus" AS ENUM ('NOT_BILLED', 'BILLED');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ServiceDepartment') THEN
    CREATE TYPE "ServiceDepartment" AS ENUM ('ER', 'LAB', 'RADIOLOGY', 'SONAR', 'ECG', 'NURSING');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingUnit') THEN
    CREATE TYPE "BillingUnit" AS ENUM ('PER_TASK', 'PER_HOUR', 'PER_MINUTE', 'PER_ITEM');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "emergency_tasks" (
  "id" TEXT NOT NULL,
  "visitId" TEXT NOT NULL,
  "type" "EmergencyTaskType" NOT NULL,
  "title" TEXT NOT NULL,
  "status" "EmergencyTaskStatus" NOT NULL DEFAULT 'PENDING',
  "prescribedBy" TEXT,
  "executedBy" TEXT,
  "billDepartment" TEXT,
  "billUnitPrice" DECIMAL(10,2),
  "billQuantity" INTEGER,
  "billedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "emergency_tasks_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "emergency_tasks"
  ADD COLUMN IF NOT EXISTS "category" "EmergencyTaskCategory" NOT NULL DEFAULT 'NURSING',
  ADD COLUMN IF NOT EXISTS "serviceCode" TEXT,
  ADD COLUMN IF NOT EXISTS "releasedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "billingStatus" "EmergencyTaskBillingStatus" NOT NULL DEFAULT 'NOT_BILLED',
  ADD COLUMN IF NOT EXISTS "billItemId" TEXT,
  ADD COLUMN IF NOT EXISTS "orderedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "releasedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "resultText" TEXT,
  ADD COLUMN IF NOT EXISTS "resultAttachmentUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "resultMeta" JSONB;

CREATE TABLE IF NOT EXISTS "service_catalog" (
  "id" TEXT NOT NULL,
  "service_code" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "department" "ServiceDepartment" NOT NULL,
  "task_category" "EmergencyTaskCategory" NOT NULL,
  "billing_unit" "BillingUnit" NOT NULL DEFAULT 'PER_TASK',
  "base_price" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'IQD',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effective_to" TIMESTAMP(3),
  "created_by" TEXT,
  "updated_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_catalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "service_catalog_service_code_key" ON "service_catalog"("service_code");
CREATE INDEX IF NOT EXISTS "idx_service_catalog_department" ON "service_catalog"("department");
CREATE INDEX IF NOT EXISTS "idx_service_catalog_task_category" ON "service_catalog"("task_category");
CREATE INDEX IF NOT EXISTS "idx_service_catalog_is_active" ON "service_catalog"("is_active");
CREATE INDEX IF NOT EXISTS "idx_service_catalog_effective_window" ON "service_catalog"("effective_from","effective_to");

CREATE INDEX IF NOT EXISTS "idx_emergency_tasks_visit_id" ON "emergency_tasks"("visitId");
CREATE INDEX IF NOT EXISTS "idx_emergency_tasks_status" ON "emergency_tasks"("status");
CREATE INDEX IF NOT EXISTS "idx_emergency_tasks_type" ON "emergency_tasks"("type");
CREATE INDEX IF NOT EXISTS "idx_emergency_tasks_category" ON "emergency_tasks"("category");
CREATE INDEX IF NOT EXISTS "idx_emergency_tasks_service_code" ON "emergency_tasks"("serviceCode");
CREATE INDEX IF NOT EXISTS "idx_emergency_tasks_billing_status" ON "emergency_tasks"("billingStatus");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'emergency_tasks_visitId_fkey') THEN
    ALTER TABLE "emergency_tasks"
      ADD CONSTRAINT "emergency_tasks_visitId_fkey"
      FOREIGN KEY ("visitId") REFERENCES "visits"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'emergency_tasks_serviceCode_fkey') THEN
    ALTER TABLE "emergency_tasks"
      ADD CONSTRAINT "emergency_tasks_serviceCode_fkey"
      FOREIGN KEY ("serviceCode") REFERENCES "service_catalog"("service_code")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
