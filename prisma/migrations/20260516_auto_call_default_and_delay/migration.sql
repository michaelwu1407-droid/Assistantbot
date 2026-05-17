-- Default new workspaces to auto-call enabled, and add a configurable delay (seconds)
-- before the voice agent dials a fresh lead. Existing rows keep their current
-- autoCallLeads value; only the default for future rows changes.

ALTER TABLE "Workspace" ALTER COLUMN "autoCallLeads" SET DEFAULT true;

ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "autoCallDelaySec" INTEGER NOT NULL DEFAULT 60;
