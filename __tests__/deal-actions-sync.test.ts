import { beforeEach, describe, expect, it, vi } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────
const dbMocks = vi.hoisted(() => ({
  deal: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  activity: { create: vi.fn() },
  task: { findFirst: vi.fn() },
  workspace: { findUnique: vi.fn() },
  user: { findFirst: vi.fn() },
  syncIssue: { create: vi.fn(), updateMany: vi.fn() },
}));

const calendarMocks = vi.hoisted(() => ({
  syncGoogleCalendarEventForDeal: vi.fn(),
  removeGoogleCalendarEventForDeal: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: dbMocks }));
vi.mock("@/lib/workspace-calendar", () => calendarMocks);
vi.mock("@/lib/sync-issues", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sync-issues")>();
  return {
    ...actual,
    recordSyncIssue: vi.fn(),
  };
});
vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess: vi.fn().mockResolvedValue({ id: "user_1", workspaceId: "ws_1", email: "test@test.com", name: "Test" }),
  requireDealInCurrentWorkspace: vi.fn().mockResolvedValue(true),
}));
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn().mockResolvedValue({
    id: "user_1",
    name: "Test User",
    email: "test@test.com",
  }),
}));
vi.mock("@/lib/workspace-audit", () => ({
  recordWorkspaceAuditEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/monitoring", () => ({
  MonitoringService: { trackEvent: vi.fn(), logError: vi.fn() },
}));
vi.mock("@/lib/ai/triage", () => ({
  triageIncomingLead: vi.fn().mockResolvedValue({ recommendation: "ACCEPT" }),
  saveTriageRecommendation: vi.fn(),
}));
vi.mock("@/actions/geo-actions", () => ({
  findNearbyBookings: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/actions/notification-actions", () => ({
  createNotification: vi.fn(),
}));
vi.mock("@/actions/automation-actions", () => ({
  evaluateAutomations: vi.fn(),
}));
vi.mock("@/lib/pricing-learning", () => ({
  maybeCreatePricingSuggestionFromConfirmedJob: vi.fn(),
}));
vi.mock("@/actions/learning-actions", () => ({
  checkForDeviation: vi.fn(),
}));
vi.mock("@/actions/task-actions", () => ({
  createTask: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { recordSyncIssue } from "@/lib/sync-issues";
import { updateDeal } from "@/actions/deal-actions";

describe("updateDeal — calendar sync failures recorded as SyncIssues", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    dbMocks.deal.findFirst.mockResolvedValue({
      id: "deal_1",
      title: "Fix leak",
      workspaceId: "ws_1",
      contactId: "contact_1",
      stage: "SCHEDULED",
      isDraft: false,
      scheduledAt: null,
      workspace: { autoUpdateGlossary: false },
    });
    dbMocks.deal.update.mockResolvedValue({});
    dbMocks.activity.create.mockResolvedValue({});
    dbMocks.user.findFirst.mockResolvedValue({ id: "user_1" });
  });

  it("records a sync issue when calendar sync fails during updateDeal", async () => {
    calendarMocks.syncGoogleCalendarEventForDeal.mockRejectedValue(new Error("Google API timeout"));

    await updateDeal("deal_1", { scheduledAt: "2026-04-01T10:00:00Z" });

    expect(recordSyncIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws_1",
        dealId: "deal_1",
        surface: "calendar_sync",
      }),
    );
  });

  it("records a sync issue when calendar removal fails during updateDeal", async () => {
    calendarMocks.removeGoogleCalendarEventForDeal.mockRejectedValue(new Error("Token expired"));

    // Schedule first, then clear
    dbMocks.deal.findFirst.mockResolvedValue({
      id: "deal_1",
      title: "Fix leak",
      workspaceId: "ws_1",
      contactId: "contact_1",
      stage: "SCHEDULED",
      isDraft: false,
      scheduledAt: new Date("2026-04-01T10:00:00Z"),
      workspace: { autoUpdateGlossary: false },
    });

    await updateDeal("deal_1", { scheduledAt: null });

    expect(recordSyncIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws_1",
        dealId: "deal_1",
        surface: "calendar_remove",
      }),
    );
  });

  it("does not record a sync issue when calendar sync succeeds", async () => {
    calendarMocks.syncGoogleCalendarEventForDeal.mockResolvedValue(undefined);

    await updateDeal("deal_1", { scheduledAt: "2026-04-01T10:00:00Z" });

    expect(recordSyncIssue).not.toHaveBeenCalled();
  });
});
