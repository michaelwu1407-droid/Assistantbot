ALTER TABLE "Workspace"
ADD COLUMN IF NOT EXISTS "nextInvoiceSequence" INTEGER;

UPDATE "Workspace"
SET "nextInvoiceSequence" = 1
WHERE "nextInvoiceSequence" IS NULL;

ALTER TABLE "Workspace"
ALTER COLUMN "nextInvoiceSequence" SET DEFAULT 1;

ALTER TABLE "Workspace"
ALTER COLUMN "nextInvoiceSequence" SET NOT NULL;
