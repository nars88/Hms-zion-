-- Run against PostgreSQL after pulling JWT token-versioning changes.
-- (Prisma migrations/ may be gitignored in this repo; keep this script as the source of truth.)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_token_version" INTEGER NOT NULL DEFAULT 0;
