# Database backup and restore

Updated: 2026-05-09 AEST

This runbook gives you one repeatable way to prove that a production database backup is not just being created, but can also be restored successfully.

## What this verifies

- a logical backup can be pulled from the production Postgres database
- the application-owned `public` schema backup can be restored into a disposable Postgres instance
- core Earlymark tables are readable after restore

## Prerequisites

- Docker installed locally
- a `DIRECT_URL` available in the environment, `.env.local`, or `.env`
- enough local disk for one compressed logical dump plus a temporary Postgres container

## One-command verification

From the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-db-backup-restore.ps1
```

What the script does:

1. Reads `DIRECT_URL`
2. Runs `pg_dump --format=custom`
3. Starts a disposable `postgres:17` container
4. Restores the dump with `pg_restore`
5. Queries counts from core tables
6. Writes a JSON summary into the output directory

Default output location:

- `%TEMP%\earlymark-db-restore-<timestamp>\`

Files produced:

- `prod-backup.dump`
- `restore-summary.json`

## Expected proof

The JSON summary should include counts for:

- `Workspace`
- `User`
- `Contact`
- `Deal`
- `VoiceCall`
- `WebhookEvent`

If those counts are returned from the restored database, the backup and restore path is working.

## Cleanup

The script removes the disposable restore container automatically.

The backup artifact remains on disk so you can move it to your secure storage location after verification. Delete the temp directory locally once the backup has been archived.

## Notes

- This is a logical backup, not a point-in-time recovery flow.
- Because the dump is sensitive production data, keep the artifact outside version control and move it to encrypted storage after verification.
- Run this again before any higher-risk data-layer work, including the Prisma major-version upgrade window.
