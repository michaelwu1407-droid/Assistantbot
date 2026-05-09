# Prisma 7 upgrade window

Updated: 2026-05-09 AEST

## Decision

Do not force a same-day Prisma `5.21.1 -> 7.x` upgrade in production.

Schedule a dedicated upgrade window instead, after a fresh verified database backup/restore.

Target window: complete the upgrade work before 2026-05-16 AEST.

## Why this is not a trivial patch

The current app is on Prisma `5.21.1` with:

- `generator client { provider = "prisma-client-js" }` in `prisma/schema.prisma`
- runtime imports from `@prisma/client`
- `new PrismaClient({ datasources: { db: { url } } })` in `lib/db.ts`
- a CLI script using `prisma db execute --file ...` in `package.json`

Prisma's current official v7 upgrade guide introduces breaking changes in all of those areas:

- Prisma ORM v7 is ESM-first
- the generated client must move to an explicit `output` path
- the old `prisma-client-js` generator is replaced by `prisma-client`
- Postgres client creation moves to a driver adapter such as `@prisma/adapter-pg`
- Prisma CLI config moves into `prisma.config.ts`
- environment variables are no longer auto-loaded by the CLI
- `prisma db execute --url` style usage changed, and CLI behavior moved toward config-driven setup

## Repo-specific risks to cover in the window

1. Replace `@prisma/client` import paths everywhere the generated client is consumed.
2. Rework `lib/db.ts` to use the v7 adapter pattern and re-check connection-limit behavior.
3. Validate SSL handling for Supabase/Postgres because Prisma v7 changes certificate defaults.
4. Add `prisma.config.ts` so CLI commands, migrations, and seeds keep working outside local shells.
5. Re-test seed scripts and operational scripts that instantiate `PrismaClient` directly.
6. Re-test Vercel build, local development, and worker-side scripts that depend on Prisma generation.

## Suggested upgrade order

1. Fresh backup + tested restore
2. Create a dedicated upgrade branch
3. Upgrade to Prisma 7 packages and generate the new client output
4. Update runtime imports and `lib/db.ts`
5. Add `prisma.config.ts`
6. Run `npx prisma generate`
7. Run `npx tsc --noEmit`
8. Run the Prisma-heavy test slice plus billing/webhook smoke tests
9. Deploy to staging first
10. Only then schedule production

## Sources

- Prisma upgrade guide to v7: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7
- Prisma system requirements: https://www.prisma.io/docs/orm/reference/system-requirements
