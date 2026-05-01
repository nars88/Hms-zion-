# ER Phase 2: Schema and Migration Strategy

This strategy finalizes normalized ER tasking and bed lifecycle management for production-safe deployment.

## 1) Prisma schema scope

The schema now includes:

- `EmergencyTask` model (normalized task/orders lifecycle per ER visit)
- `ERBed` model (single active occupant per bed via `currentVisitId`)
- `Visit.erBedId` relation for current/last attached ER bed context

## 2) Migration rollout plan

1. Generate migration locally:
   - `npx prisma migrate dev --name er_phase2_tasks_beds`
2. Validate generated SQL:
   - Confirm `emergency_tasks` and `er_beds` tables
   - Confirm indexes:
     - `idx_emergency_tasks_visit_id`
     - `idx_emergency_tasks_status`
     - `idx_emergency_tasks_type`
     - `idx_er_beds_is_active`
   - Confirm unique constraints:
     - `er_beds.bed_number`
     - `er_beds.current_visit_id`
3. Apply in staging:
   - `npx prisma migrate deploy`
4. Backfill/cleanup (if needed):
   - Set `visit.er_bed_id` to null where stale
   - Clear `er_beds.current_visit_id` for already discharged/completed visits
5. Production deploy on Vercel:
   - Keep migration execution in CI/CD pre-start step (`prisma migrate deploy`)
   - Ensure secrets are configured: `DATABASE_URL`, `QR_SIGNING_SECRET` (or `NEXTAUTH_SECRET` fallback), optional `ER_BADGE_TTL_MINUTES`

## 3) Runtime safety assumptions

- All bed allocate/release operations are transaction-scoped.
- Bed occupancy conflicts throw deterministic errors.
- ER badge payload validation uses HMAC signature + TTL validation.
- Discharge/completion routes release bed occupancy and nullify `Visit.erBedId` + `Visit.bedNumber`.

## 4) Vercel readiness checklist

- Node runtime APIs only (crypto HMAC, Prisma client).
- No filesystem dependency.
- Idempotent deploy behavior via `prisma migrate deploy`.
- Environment-driven TTL and signing secret configuration.
