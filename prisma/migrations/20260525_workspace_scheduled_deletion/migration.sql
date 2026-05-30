-- Add scheduled deletion support to Workspace
-- Allows a 30-day cooling-off window before hard-deleting a workspace.
ALTER TABLE "Workspace" ADD COLUMN "scheduledForDeletionAt" TIMESTAMP(3);
