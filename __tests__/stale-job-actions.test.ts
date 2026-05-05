import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: {
    deal: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  requireCurrentWorkspaceAccess: vi.fn(),
  requireDealInCurrentWorkspace: vi.fn(),
  revalidatePath: vi.fn(),
  logActivity: vi.fn(),
  trackEvent: vi.fn(),
  logError: vi.fn(),
  maybeCreatePricingSuggestionFromConfirmedJob: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess: hoisted.requireCurrentWorkspaceAccess,
  requireDealInCurrentWorkspace: hoisted.requireDealInCurrentWorkspace,
}));
vi.mock("next/cache", () => ({ revalidatePath: hoisted.revalidatePath }));
vi.mock("@/actions/activity-actions", () => ({ logActivity: hoisted.logActivity }));
vi.mock("@/lib/monitoring", () => ({
  MonitoringService: {
    trackEvent: hoisted.trackEvent,
    logError: hoisted.logError,
  },
}));
vi.mock("@/lib/pricing-learning", () => ({
  maybeCreatePricingSuggestionFromConfirmedJob: hoisted.maybeCreatePricingSuggestionFromConfirmedJob,
}));

import { reconcileStaleJob, scanAndUpdateStaleJobs } from "@/actions/stale-job-actions";

describe("stale-job-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      workspaceId: "ws_1",
      role: "MANAGER",
    });
    hoisted.requireDealInCurrentWorkspace.mockResolvedValue({
      actor: { id: "user_1", workspaceId: "ws_1", role: "MANAGER" },
      deal: { id: "deal_1", workspaceId: "ws_1" },
    });
  });

  it("reconciles jobs through shared workspace access instead of owner-only lookup", async () => {
    hoisted.db.deal.findFirst.mockResolvedValue({
      id: "deal_1",
      workspaceId: "ws_1",
      contactId: "contact_1",
      metadata: null,
      contact: { id: "contact_1" },
    });
    hoisted.db.deal.update.mockResolvedValue({
      id: "deal_1",
      actualOutcome: "COMPLETED",
      stage: "WON",
    });

    const result = await reconcileStaleJob({
      dealId: "deal_1",
      actualOutcome: "COMPLETED",
      outcomeNotes: "Finished on site",
    });

    expect(result).toEqual({
      success: true,
      data: {
        dealId: "deal_1",
        actualOutcome: "COMPLETED",
        stage: "WON",
      },
    });
    expect(hoisted.requireDealInCurrentWorkspace).toHaveBeenCalledWith("deal_1");
    expect(hoisted.db.deal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "deal_1", workspaceId: "ws_1" },
      }),
    );
    expect(hoisted.db.deal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "deal_1" },
        data: expect.objectContaining({
          actualOutcome: "COMPLETED",
          stage: "WON",
          isStale: false,
        }),
      }),
    );
    expect(hoisted.logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        dealId: "deal_1",
        contactId: "contact_1",
        title: "Job Reconciled",
      }),
    );
  });

  it("keeps interactive stale scans scoped to the signed-in workspace", async () => {
    const result = await scanAndUpdateStaleJobs("ws_other");

    expect(result).toEqual({ success: false, error: "Forbidden workspace access" });
    expect(hoisted.db.deal.findMany).not.toHaveBeenCalled();
    expect(hoisted.db.deal.updateMany).not.toHaveBeenCalled();
  });

  it("lets trusted cron scans run system-side without an interactive user", async () => {
    hoisted.requireCurrentWorkspaceAccess.mockRejectedValue(new Error("Unauthorized"));
    hoisted.db.deal.findMany.mockResolvedValue([
      {
        id: "deal_1",
        title: "Overdue job",
        scheduledAt: new Date("2026-04-10T00:00:00.000Z"),
        contactId: "contact_1",
        workspaceId: "ws_1",
      },
    ]);
    hoisted.db.deal.updateMany.mockResolvedValue({ count: 1 });

    const result = await scanAndUpdateStaleJobs(undefined, { system: true });

    expect(result).toEqual({
      success: true,
      data: {
        overdueCount: 1,
        updatedCount: 1,
      },
    });
    expect(hoisted.requireCurrentWorkspaceAccess).not.toHaveBeenCalled();
    expect(hoisted.db.deal.findMany).toHaveBeenCalledWith({
      where: expect.not.objectContaining({
        workspaceId: expect.any(String),
      }),
      select: expect.any(Object),
    });
    expect(hoisted.db.deal.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["deal_1"] } },
      data: expect.objectContaining({ isStale: true }),
    });
  });
});
