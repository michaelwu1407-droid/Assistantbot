-- CreateEnum
CREATE TYPE "ActionExecutionStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE IF NOT EXISTS "ActionExecution" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "status" "ActionExecutionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ActionExecution_idempotencyKey_key" ON "ActionExecution"("idempotencyKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ActionExecution_actionType_createdAt_idx" ON "ActionExecution"("actionType", "createdAt");

