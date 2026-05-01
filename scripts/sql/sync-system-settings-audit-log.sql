-- Idempotent: create branding + audit tables without full `db push` (avoids pooler DROP INDEX timeouts).
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_name" TEXT NOT NULL,
    "user_role" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "audit_logs"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "audit_logs"("user_id");

CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" TEXT NOT NULL,
    "system_name" TEXT NOT NULL DEFAULT 'NARS Hospital',
    "logo_url" TEXT,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);
