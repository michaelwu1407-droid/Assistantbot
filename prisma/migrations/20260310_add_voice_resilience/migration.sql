ALTER TABLE "Workspace"
ADD COLUMN IF NOT EXISTS "twilioPhoneNumberNormalized" TEXT;

UPDATE "Workspace"
SET "twilioPhoneNumberNormalized" = CASE
  WHEN "twilioPhoneNumber" IS NULL OR btrim("twilioPhoneNumber") = '' THEN NULL
  ELSE
    CASE
      WHEN regexp_replace("twilioPhoneNumber", '[^0-9+]', '', 'g') LIKE '+%' THEN regexp_replace("twilioPhoneNumber", '[^0-9+]', '', 'g')
      WHEN regexp_replace("twilioPhoneNumber", '[^0-9]', '', 'g') LIKE '0%' THEN '+61' || substr(regexp_replace("twilioPhoneNumber", '[^0-9]', '', 'g'), 2)
      WHEN regexp_replace("twilioPhoneNumber", '[^0-9]', '', 'g') LIKE '61%' THEN '+' || regexp_replace("twilioPhoneNumber", '[^0-9]', '', 'g')
      ELSE regexp_replace("twilioPhoneNumber", '[^0-9+]', '', 'g')
    END
END
WHERE "twilioPhoneNumber" IS NOT NULL
  AND ("twilioPhoneNumberNormalized" IS NULL OR btrim("twilioPhoneNumberNormalized") = '');

CREATE INDEX IF NOT EXISTS "Workspace_twilioPhoneNumberNormalized_idx"
ON "Workspace"("twilioPhoneNumberNormalized");

CREATE TABLE IF NOT EXISTS "VoiceWorkerHeartbeat" (
  "id" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "workerRole" TEXT NOT NULL,
  "surfaceSet" JSONB,
  "deployGitSha" TEXT,
  "runtimeFingerprint" TEXT NOT NULL,
  "ready" BOOLEAN NOT NULL DEFAULT false,
  "activeCalls" INTEGER NOT NULL DEFAULT 0,
  "summary" JSONB,
  "heartbeatAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VoiceWorkerHeartbeat_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "VoiceWorkerHeartbeat_hostId_workerRole_heartbeatAt_idx"
ON "VoiceWorkerHeartbeat"("hostId", "workerRole", "heartbeatAt");

CREATE INDEX IF NOT EXISTS "VoiceWorkerHeartbeat_heartbeatAt_idx"
ON "VoiceWorkerHeartbeat"("heartbeatAt");

CREATE TABLE IF NOT EXISTS "VoiceIncident" (
  "id" TEXT NOT NULL,
  "incidentKey" TEXT NOT NULL,
  "surface" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "summary" TEXT NOT NULL,
  "details" JSONB,
  "detectedAt" TIMESTAMP(3) NOT NULL,
  "lastObservedAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "lastAlertedAt" TIMESTAMP(3),
  "lastRecoveryAlertedAt" TIMESTAMP(3),
  "alertCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "VoiceIncident_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "VoiceIncident_incidentKey_key"
ON "VoiceIncident"("incidentKey");

CREATE INDEX IF NOT EXISTS "VoiceIncident_status_surface_updatedAt_idx"
ON "VoiceIncident"("status", "surface", "updatedAt");
