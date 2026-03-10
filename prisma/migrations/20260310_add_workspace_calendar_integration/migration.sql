CREATE TABLE "WorkspaceCalendarIntegration" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "emailAddress" TEXT,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceCalendarIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceCalendarIntegration_workspaceId_provider_key"
ON "WorkspaceCalendarIntegration"("workspaceId", "provider");

CREATE INDEX "WorkspaceCalendarIntegration_workspaceId_isActive_idx"
ON "WorkspaceCalendarIntegration"("workspaceId", "isActive");

ALTER TABLE "WorkspaceCalendarIntegration"
ADD CONSTRAINT "WorkspaceCalendarIntegration_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
