import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  syncIssue: {
    create: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db: dbMocks,
}));

vi.mock("@/lib/monitoring", () => ({
  MonitoringService: {
    logError: vi.fn(),
  },
}));

import { recordSyncIssue, resolveSyncIssuesForDeal } from "@/lib/sync-issues";
import { MonitoringService } from "@/lib/monitoring";

describe("recordSyncIssue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.syncIssue.create.mockResolvedValue({ id: "si_1" });
    dbMocks.syncIssue.updateMany.mockResolvedValue({ count: 1 });
  });

  it("creates a sync issue record in the database", async () => {
    await recordSyncIssue({
      workspaceId: "ws_1",
      dealId: "deal_1",
      contactId: "contact_1",
      surface: "calendar_sync",
      message: "Calendar sync failed",
    });

    expect(dbMocks.syncIssue.create).toHaveBeenCalledWith({
      data: {
        workspaceId: "ws_1",
        dealId: "deal_1",
        contactId: "contact_1",
        surface: "calendar_sync",
        message: "Calendar sync failed",
      },
    });
  });

  it("handles null dealId and contactId gracefully", async () => {
    await recordSyncIssue({
      workspaceId: "ws_1",
      dealId: null,
      contactId: null,
      surface: "chat_save",
      message: "Failed to save chat",
    });

    expect(dbMocks.syncIssue.create).toHaveBeenCalledWith({
      data: {
        workspaceId: "ws_1",
        dealId: undefined,
        contactId: undefined,
        surface: "chat_save",
        message: "Failed to save chat",
      },
    });
  });

  it("logs to monitoring service if DB write fails", async () => {
    dbMocks.syncIssue.create.mockRejectedValue(new Error("DB down"));

    await recordSyncIssue({
      workspaceId: "ws_1",
      surface: "calendar_sync",
      message: "test",
    });

    // Should not throw
    expect(MonitoringService.logError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ component: "recordSyncIssue", workspaceId: "ws_1" }),
    );
  });
});

describe("resolveSyncIssuesForDeal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.syncIssue.updateMany.mockResolvedValue({ count: 2 });
  });

  it("marks all unresolved issues for the deal as resolved", async () => {
    await resolveSyncIssuesForDeal("deal_1");

    expect(dbMocks.syncIssue.updateMany).toHaveBeenCalledWith({
      where: { dealId: "deal_1", resolved: false },
      data: { resolved: true },
    });
  });

  it("does not throw if updateMany fails", async () => {
    dbMocks.syncIssue.updateMany.mockRejectedValue(new Error("DB error"));

    // Should not throw
    await expect(resolveSyncIssuesForDeal("deal_1")).resolves.toBeUndefined();
  });
});
