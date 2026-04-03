import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: {
    deal: {
      create: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
  requireCurrentWorkspaceAccess: vi.fn(),
  requireDealInCurrentWorkspace: vi.fn(),
  revalidatePath: vi.fn(),
  evaluateAutomations: vi.fn(),
  createNotification: vi.fn(),
  getAuthUser: vi.fn(),
  trackEvent: vi.fn(),
  logError: vi.fn(),
  maybeCreatePricingSuggestionFromConfirmedJob: vi.fn(),
  triageIncomingLead: vi.fn(),
  saveTriageRecommendation: vi.fn(),
  checkForDeviation: vi.fn(),
  findNearbyBookings: vi.fn(),
  createTask: vi.fn(),
  syncGoogleCalendarEventForDeal: vi.fn(),
  removeGoogleCalendarEventForDeal: vi.fn(),
  recordWorkspaceAuditEvent: vi.fn(),
  recordSyncIssue: vi.fn(),
  kanbanStageRequiresScheduledDate: vi.fn(),
  loggerError: vi.fn(),
  sendConfirmationSMS: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess: hoisted.requireCurrentWorkspaceAccess,
  requireDealInCurrentWorkspace: hoisted.requireDealInCurrentWorkspace,
}));
vi.mock("next/cache", () => ({
  revalidatePath: hoisted.revalidatePath,
}));
vi.mock("@/actions/automation-actions", () => ({
  evaluateAutomations: hoisted.evaluateAutomations,
}));
vi.mock("@/actions/notification-actions", () => ({
  createNotification: hoisted.createNotification,
}));
vi.mock("@/lib/auth", () => ({
  getAuthUser: hoisted.getAuthUser,
}));
vi.mock("@/lib/monitoring", () => ({
  MonitoringService: {
    trackEvent: hoisted.trackEvent,
    logError: hoisted.logError,
  },
}));
vi.mock("@/lib/pricing-learning", () => ({
  maybeCreatePricingSuggestionFromConfirmedJob: hoisted.maybeCreatePricingSuggestionFromConfirmedJob,
}));
vi.mock("@/lib/ai/triage", () => ({
  triageIncomingLead: hoisted.triageIncomingLead,
  saveTriageRecommendation: hoisted.saveTriageRecommendation,
}));
vi.mock("@/actions/learning-actions", () => ({
  checkForDeviation: hoisted.checkForDeviation,
}));
vi.mock("@/actions/geo-actions", () => ({
  findNearbyBookings: hoisted.findNearbyBookings,
}));
vi.mock("@/actions/task-actions", () => ({
  createTask: hoisted.createTask,
}));
vi.mock("@/lib/workspace-calendar", () => ({
  syncGoogleCalendarEventForDeal: hoisted.syncGoogleCalendarEventForDeal,
  removeGoogleCalendarEventForDeal: hoisted.removeGoogleCalendarEventForDeal,
}));
vi.mock("@/lib/workspace-audit", () => ({
  recordWorkspaceAuditEvent: hoisted.recordWorkspaceAuditEvent,
}));
vi.mock("@/lib/sync-issues", () => ({
  recordSyncIssue: hoisted.recordSyncIssue,
}));
vi.mock("@/lib/deal-stage-rules", () => ({
  kanbanStageRequiresScheduledDate: hoisted.kanbanStageRequiresScheduledDate,
}));
vi.mock("@/lib/logging", () => ({
  logger: {
    error: hoisted.loggerError,
  },
}));
vi.mock("@/actions/messaging-actions", () => ({
  sendConfirmationSMS: hoisted.sendConfirmationSMS,
}));

import { createDeal, updateDeal, updateDealStage } from "@/actions/deal-actions";

describe("deal-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      workspaceId: "ws_1",
    });
    hoisted.requireDealInCurrentWorkspace.mockResolvedValue({
      actor: { id: "user_1", workspaceId: "ws_1" },
      deal: {
        id: "deal_1",
        workspaceId: "ws_1",
        contactId: "contact_1",
        stage: "SCHEDULED",
        metadata: {},
        assignedToId: "worker_1",
        scheduledAt: new Date("2026-04-01T10:00:00.000Z"),
        updatedAt: new Date("2026-04-01T08:00:00.000Z"),
      },
    });
    hoisted.db.deal.create.mockResolvedValue({ id: "deal_1" });
    hoisted.db.deal.updateMany.mockResolvedValue({ count: 1 });
    hoisted.db.deal.findUnique.mockResolvedValue({
      id: "deal_1",
      workspaceId: "ws_1",
      contactId: "contact_1",
      stage: "PENDING_COMPLETION",
    });
    hoisted.db.deal.findFirst.mockResolvedValue({
      id: "deal_1",
      title: "Hot Water Fix",
      workspaceId: "ws_1",
      contactId: "contact_1",
      stage: "CONTACTED",
      isDraft: false,
      scheduledAt: null,
      workspace: { autoUpdateGlossary: false },
    });
    hoisted.db.deal.update.mockResolvedValue({});
    hoisted.triageIncomingLead.mockResolvedValue({ recommendation: "ACCEPT" });
    hoisted.getAuthUser.mockResolvedValue({
      name: "Sam",
      email: "sam@example.com",
    });
    hoisted.db.user.findFirst.mockResolvedValue({ id: "user_1", role: "TEAM_MEMBER" });
    hoisted.kanbanStageRequiresScheduledDate.mockReturnValue(false);
    hoisted.syncGoogleCalendarEventForDeal.mockResolvedValue(undefined);
    hoisted.removeGoogleCalendarEventForDeal.mockResolvedValue(undefined);
    hoisted.sendConfirmationSMS.mockResolvedValue({ success: true });
  });

  it("creates a deal, logs activity, and records audit metadata", async () => {
    const result = await createDeal({
      title: "Hot Water Fix",
      value: 250,
      stage: "new",
      contactId: "contact_1",
      workspaceId: "ws_1",
    });

    expect(result).toEqual({ success: true, dealId: "deal_1" });
    expect(hoisted.db.deal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Hot Water Fix",
        value: 250,
        stage: "NEW",
        contactId: "contact_1",
        workspaceId: "ws_1",
        assignedToId: null,
      }),
    });
    expect(hoisted.db.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Deal created",
        dealId: "deal_1",
        contactId: "contact_1",
      }),
    });
    expect(hoisted.recordWorkspaceAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws_1",
        action: "deal.created",
        entityId: "deal_1",
      }),
    );
    expect(hoisted.saveTriageRecommendation).toHaveBeenCalledWith("deal_1", {
      recommendation: "ACCEPT",
    });
    expect(hoisted.trackEvent).toHaveBeenCalledWith(
      "deal_created",
      expect.objectContaining({
        dealId: "deal_1",
        workspaceId: "ws_1",
        stage: "NEW",
      }),
    );
  });

  it("blocks scheduled deal creation when no team member is assigned", async () => {
    const result = await createDeal({
      title: "Booked Job",
      value: 800,
      stage: "scheduled",
      contactId: "contact_1",
      workspaceId: "ws_1",
      scheduledAt: new Date("2026-04-02T09:00:00.000Z"),
    });

    expect(result).toEqual({
      success: false,
      error: "Assign a team member when creating a job in Scheduled stage.",
    });
    expect(hoisted.db.deal.create).not.toHaveBeenCalled();
  });

  it("moves team-member completions into pending approval instead of WON", async () => {
    hoisted.db.user.findFirst
      .mockResolvedValueOnce({ id: "user_1", role: "TEAM_MEMBER" })
      .mockResolvedValueOnce({ id: "user_1" })
      .mockResolvedValueOnce({ id: "user_1" });

    const result = await updateDealStage("deal_1", "completed");

    expect(result).toEqual({ success: true });
    expect(hoisted.db.deal.updateMany).toHaveBeenCalledWith({
      where: {
        id: "deal_1",
        updatedAt: new Date("2026-04-01T08:00:00.000Z"),
      },
      data: expect.objectContaining({
        stage: "PENDING_COMPLETION",
      }),
    });
    expect(hoisted.db.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Moved to Pending approval",
        dealId: "deal_1",
        contactId: "contact_1",
        userId: "user_1",
      }),
    });
    expect(hoisted.recordWorkspaceAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws_1",
        action: "deal.stage_changed",
        metadata: expect.objectContaining({
          nextStage: "PENDING_COMPLETION",
          previousStage: "SCHEDULED",
        }),
      }),
    );
    expect(hoisted.evaluateAutomations).not.toHaveBeenCalled();
  });

  it("fires a booking confirmation when a deal enters scheduled via updateDealStage", async () => {
    hoisted.requireDealInCurrentWorkspace.mockResolvedValue({
      actor: { id: "user_1", workspaceId: "ws_1" },
      deal: {
        id: "deal_1",
        workspaceId: "ws_1",
        contactId: "contact_1",
        stage: "CONTACTED",
        metadata: {},
        assignedToId: "worker_1",
        scheduledAt: new Date("2026-04-01T10:00:00.000Z"),
        updatedAt: new Date("2026-04-01T08:00:00.000Z"),
      },
    });
    hoisted.db.deal.findUnique.mockResolvedValue({
      id: "deal_1",
      workspaceId: "ws_1",
      contactId: "contact_1",
      stage: "SCHEDULED",
    });

    const result = await updateDealStage("deal_1", "scheduled");

    expect(result).toEqual({ success: true });
    expect(hoisted.sendConfirmationSMS).toHaveBeenCalledWith("deal_1");
  });

  it("fires a booking confirmation when updateDeal moves a deal into scheduled", async () => {
    const result = await updateDeal("deal_1", {
      stage: "scheduled",
      scheduledAt: "2026-04-01T10:00:00.000Z",
    });

    expect(result).toEqual({ success: true });
    expect(hoisted.sendConfirmationSMS).toHaveBeenCalledWith("deal_1");
  });
});
