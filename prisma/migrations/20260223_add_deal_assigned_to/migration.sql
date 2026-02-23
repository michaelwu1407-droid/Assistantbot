-- AlterTable: Add team member assignment to Deal
ALTER TABLE "Deal" ADD COLUMN "assignedToId" TEXT;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
