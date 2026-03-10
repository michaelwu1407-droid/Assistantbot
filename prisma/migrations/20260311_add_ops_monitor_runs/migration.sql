CREATE TABLE IF NOT EXISTS "OpsMonitorRun" (
  "id" TEXT NOT NULL,
  "monitorKey" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "details" JSONB,
  "lastSuccessAt" TIMESTAMP(3),
  "lastFailureAt" TIMESTAMP(3),
  "checkedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpsMonitorRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "OpsMonitorRun_monitorKey_key"
ON "OpsMonitorRun"("monitorKey");

CREATE INDEX IF NOT EXISTS "OpsMonitorRun_status_checkedAt_idx"
ON "OpsMonitorRun"("status", "checkedAt");
