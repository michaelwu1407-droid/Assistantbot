-- Support ticket workflow: dedicated model with status, SLA deadline, and notes

CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

CREATE TABLE "support_tickets" (
  "id"          TEXT                   NOT NULL,
  "ref"         TEXT                   NOT NULL,
  "workspaceId" TEXT                   NOT NULL,
  "userId"      TEXT                   NOT NULL,
  "subject"     TEXT                   NOT NULL,
  "message"     TEXT                   NOT NULL,
  "priority"    TEXT                   NOT NULL DEFAULT 'medium',
  "status"      "SupportTicketStatus"  NOT NULL DEFAULT 'OPEN',
  "source"      TEXT                   NOT NULL DEFAULT 'settings_form',
  "slaDeadline" TIMESTAMP(3)           NOT NULL,
  "resolvedAt"  TIMESTAMP(3),
  "metadata"    JSONB                  DEFAULT '{}',
  "createdAt"   TIMESTAMP(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)           NOT NULL,
  CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "support_tickets_ref_key"
  ON "support_tickets"("ref");

CREATE INDEX "support_tickets_workspaceId_status_createdAt_idx"
  ON "support_tickets"("workspaceId", "status", "createdAt");

CREATE INDEX "support_tickets_userId_status_idx"
  ON "support_tickets"("userId", "status");

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "support_ticket_notes" (
  "id"        TEXT         NOT NULL,
  "ticketId"  TEXT         NOT NULL,
  "content"   TEXT         NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "support_ticket_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "support_ticket_notes_ticketId_createdAt_idx"
  ON "support_ticket_notes"("ticketId", "createdAt");

ALTER TABLE "support_ticket_notes"
  ADD CONSTRAINT "support_ticket_notes_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
