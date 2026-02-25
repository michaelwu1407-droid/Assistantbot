-- Add Email Lead Capture & Auto-Response settings to Workspace
-- inboundEmailAlias: used to match [alias]@inbound.earlymark.ai for forwarded "Lead Won" emails
-- autoCallLeads: when true, trigger Retell call to the lead on receipt of a lead notification email

ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "inboundEmailAlias" TEXT;
ALTER TABLE "Workspace" ADD COLUMN IF NOT EXISTS "autoCallLeads" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_inboundEmailAlias_key" ON "Workspace"("inboundEmailAlias");
