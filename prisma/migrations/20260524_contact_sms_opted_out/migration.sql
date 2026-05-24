-- Add SMS opt-out flag to Contact
ALTER TABLE "Contact" ADD COLUMN "smsOptedOut" BOOLEAN NOT NULL DEFAULT false;
