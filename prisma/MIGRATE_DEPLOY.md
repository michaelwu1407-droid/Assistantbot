# Fixing P3005 when running `prisma migrate deploy`

**Error P3005** means: *"The database schema is not empty."*

It happens when the database already has tables (e.g. from a previous deploy or from `prisma db push`), but Prisma’s migration history doesn’t match. `migrate deploy` then refuses to run.

## Option A: Deploying to a **fresh** database

- Use a **new, empty** database for the deploy (e.g. new DB in your host, or a clean CI database).
- Set `DATABASE_URL` (and `DIRECT_URL` if used) to that empty database.
- Run: `npx prisma migrate deploy`
- Then run your app / `next build` as usual.

## Option B: Database **already has** the schema (e.g. production)

You need to **baseline** so Prisma treats existing migrations as already applied.

1. **One-time: mark all current migrations as applied** (do not run the SQL again):

   On Windows (PowerShell), from the project root:

   ```powershell
   npx prisma migrate resolve --applied "20250216_add_settings_to_workspace"
   npx prisma migrate resolve --applied "20250219_add_deal_stage_deleted"
   npx prisma migrate resolve --applied "20260223_add_deal_assigned_to"
   npx prisma migrate resolve --applied "20260225_add_email_lead_capture"
   npx prisma migrate resolve --applied "20260226_add_pending_completion_stage"
   npx prisma migrate resolve --applied "add_verification_codes"
   ```

   Use the **exact** migration folder names from `prisma/migrations/`. This only adds rows to `_prisma_migrations`; it does not run the migration SQL again.

2. **From then on**, in CI or deploy scripts, run:

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   next build
   ```

   New migrations (added later with `prisma migrate dev`) will be applied as usual; existing ones stay marked as applied.

## Option C: CI uses a new DB every time

If CI creates a **new empty database** for each run:

- Ensure no other step creates tables before `prisma migrate deploy` (e.g. no `db push`, no manual SQL).
- Ensure `DATABASE_URL` in CI points to that empty DB when the deploy command runs.

If the DB is not empty (e.g. reused), use Option A or B instead.

---

**Reference:** [Prisma baselining](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining)
