-- AlterTable
ALTER TABLE "Deal" ADD COLUMN "followUpAt" TIMESTAMP(3);
ALTER TABLE "Deal" ADD COLUMN "followUpNote" TEXT;
ALTER TABLE "Deal" ADD COLUMN "followUpCompletedAt" TIMESTAMP(3);
ALTER TABLE "Deal" ADD COLUMN "followUpChannel" TEXT;
