/**
 * In-memory email outbox used only in E2E test environments.
 * Populated by sendOwnerNotificationEmail() when NODE_ENV === "test"
 * or E2E_MODE === "true". Tests read it via GET /api/test/inspect/email-outbox.
 */

const isTestMode =
  process.env.NODE_ENV === "test" || process.env.E2E_MODE === "true";

export type OutboxEntry = {
  template: string;
  to: string;
  subject?: string;
  workspaceId?: string;
  sentAt: string;
};

// Module-level singleton — shared across requests in the same Node.js process
const outbox: OutboxEntry[] = [];

export function addToTestOutbox(entry: Omit<OutboxEntry, "sentAt">) {
  if (!isTestMode) return;
  outbox.push({ ...entry, sentAt: new Date().toISOString() });
}

export function getTestOutbox(): OutboxEntry[] {
  return [...outbox];
}

export function clearTestOutbox() {
  outbox.length = 0;
}
