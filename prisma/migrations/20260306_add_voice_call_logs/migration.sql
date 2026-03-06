-- CreateTable
CREATE TABLE "VoiceCall" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'livekit',
    "callType" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "participantIdentity" TEXT NOT NULL,
    "workspaceId" TEXT,
    "contactId" TEXT,
    "callerPhone" TEXT,
    "calledPhone" TEXT,
    "callerName" TEXT,
    "businessName" TEXT,
    "transcriptText" TEXT,
    "transcriptTurns" JSONB,
    "summary" TEXT,
    "latency" JSONB,
    "leadCapture" JSONB,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoiceCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VoiceCall_callId_key" ON "VoiceCall"("callId");

-- CreateIndex
CREATE INDEX "VoiceCall_workspaceId_createdAt_idx" ON "VoiceCall"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "VoiceCall_contactId_createdAt_idx" ON "VoiceCall"("contactId", "createdAt");

-- CreateIndex
CREATE INDEX "VoiceCall_callType_createdAt_idx" ON "VoiceCall"("callType", "createdAt");

-- AddForeignKey
ALTER TABLE "VoiceCall" ADD CONSTRAINT "VoiceCall_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceCall" ADD CONSTRAINT "VoiceCall_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
