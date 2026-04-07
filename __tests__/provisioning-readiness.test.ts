import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    workspace: {
      findMany: hoisted.findMany,
    },
  },
}));

import { getProvisioningReadinessSummary } from "@/lib/provisioning-readiness";

describe("getProvisioningReadinessSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ignores stale orphaned failed provisioning rows with no workspace data", async () => {
    hoisted.findMany.mockResolvedValue([
      {
        id: "ws_orphan",
        name: "My Workspace",
        ownerId: "owner_1",
        inboundEmail: null,
        twilioPhoneNumber: null,
        updatedAt: new Date("2026-03-16T23:52:51.356Z"),
        settings: {
          onboardingProvisioningStatus: "failed",
          onboardingProvisioningError: "Old beta failure",
          provisionPhoneNumberRequested: true,
        },
        owner: {
          workspaceId: "another_workspace",
        },
        _count: {
          contacts: 0,
          deals: 0,
          chatMessages: 0,
        },
      },
    ]);

    const result = await getProvisioningReadinessSummary();

    expect(result.status).toBe("healthy");
    expect(result.failedCount).toBe(0);
    expect(result.counts.untracked).toBe(1);
    expect(result.recentIssues).toEqual([]);
  });

  it("keeps a real failed provisioning workspace visible when it still owns data", async () => {
    hoisted.findMany.mockResolvedValue([
      {
        id: "ws_real",
        name: "Active Workspace",
        ownerId: "owner_2",
        inboundEmail: null,
        twilioPhoneNumber: null,
        updatedAt: new Date("2026-04-07T08:00:00.000Z"),
        settings: {
          onboardingProvisioningStatus: "failed",
          onboardingProvisioningError: "Bundle clone failed",
          onboardingProvisioningStageReached: "bundle-clone",
          onboardingProvisioningUpdatedAt: "2026-04-07T08:00:00.000Z",
        },
        owner: {
          workspaceId: "ws_real",
        },
        _count: {
          contacts: 2,
          deals: 1,
          chatMessages: 3,
        },
      },
    ]);

    const result = await getProvisioningReadinessSummary();

    expect(result.status).toBe("unhealthy");
    expect(result.failedCount).toBe(1);
    expect(result.counts.failed).toBe(1);
    expect(result.recentIssues).toHaveLength(1);
    expect(result.recentIssues[0]?.workspaceId).toBe("ws_real");
  });
});
