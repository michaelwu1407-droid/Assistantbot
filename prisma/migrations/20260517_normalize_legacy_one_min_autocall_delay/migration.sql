-- The old 60-second delay default was dishonest because scheduled callbacks
-- only run on a 5-minute cron floor. Normalize legacy workspaces that still
-- carry the old default so they move to Immediate like the updated product.

UPDATE "Workspace"
SET "autoCallDelaySec" = 0
WHERE "autoCallDelaySec" = 60;
