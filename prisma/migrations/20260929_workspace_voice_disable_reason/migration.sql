-- Record why and when voice was switched off for a workspace.
-- The Twilio daily spend cap pauses voice automatically; these columns let that
-- pause expire on its own at the next billing day without also re-enabling a
-- workspace that was deliberately disabled by support or the owner.
ALTER TABLE "Workspace" ADD COLUMN "voiceDisabledReason" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "voiceDisabledAt" TIMESTAMP(3);
