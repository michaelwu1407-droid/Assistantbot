-- Auto-call: switch default delay to immediate (0s) and backfill existing
-- workspaces.
--
-- 1. Default delay was 60s, but our scheduled-calls cron runs every 5 min
--    (GitHub Actions floor), so a "60s" default was never actually honoured.
--    Per CLAUDE.md "never ask anything technical of the customer", we don't
--    surface this limitation — we just default to immediate dispatch, which
--    bypasses the cron entirely.
-- 2. autoCallLeads default was previously flipped to true for new rows.
--    Backfill existing rows so every tradie gets the new-signup
--    experience — the toggle is still available in settings if anyone
--    wants to turn it off.

ALTER TABLE "Workspace" ALTER COLUMN "autoCallDelaySec" SET DEFAULT 0;

UPDATE "Workspace" SET "autoCallLeads" = true WHERE "autoCallLeads" = false;
