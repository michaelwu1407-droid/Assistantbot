-- Add email opt-out flag to Contact
ALTER TABLE "Contact" ADD COLUMN "emailOptedOut" BOOLEAN NOT NULL DEFAULT false;
