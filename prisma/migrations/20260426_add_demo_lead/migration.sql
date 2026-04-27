-- CreateTable
CREATE TABLE "DemoLead" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "businessName" TEXT,
    "source" TEXT NOT NULL DEFAULT 'homepage_form',
    "callStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "callError" TEXT,
    "roomName" TEXT,
    "resolvedTrunkId" TEXT,
    "callerNumber" TEXT,
    "warnings" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemoLead_phone_createdAt_idx" ON "DemoLead"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "DemoLead_callStatus_createdAt_idx" ON "DemoLead"("callStatus", "createdAt");

-- CreateIndex
CREATE INDEX "DemoLead_createdAt_idx" ON "DemoLead"("createdAt");
