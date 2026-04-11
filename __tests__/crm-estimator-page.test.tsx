import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { requireCurrentWorkspaceAccess, getDeals, redirect } = vi.hoisted(() => ({
  requireCurrentWorkspaceAccess: vi.fn(),
  getDeals: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess,
}));

vi.mock("@/actions/deal-actions", () => ({
  getDeals,
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/components/tradie/estimator-form", () => ({
  EstimatorForm: ({ deals, workspaceId }: { deals: Array<{ id: string; title: string }>; workspaceId: string }) => (
    <div>
      estimator:{workspaceId}:{deals.map((deal) => deal.title).join(",")}
    </div>
  ),
}));

import CrmEstimatorPage from "@/app/crm/estimator/page";

describe("CrmEstimatorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      role: "OWNER",
      workspaceId: "ws_1",
    });
    getDeals.mockResolvedValue([
      { id: "deal_1", title: "Blocked drain", stage: "scheduled", assignedToId: "user_1" },
      { id: "deal_2", title: "Lost lead", stage: "lost", assignedToId: "user_1" },
    ]);
  });

  it("renders the estimator with active deals", async () => {
    render(await CrmEstimatorPage());

    expect(screen.getByText("Estimator")).toBeInTheDocument();
    expect(screen.getByText("estimator:ws_1:Blocked drain")).toBeInTheDocument();
  });

  it("scopes team members to assigned deals only", async () => {
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "app_user_1",
      role: "TEAM_MEMBER",
      workspaceId: "ws_1",
    });
    getDeals.mockResolvedValue([
      { id: "deal_1", title: "Blocked drain", stage: "scheduled", assignedToId: "app_user_1" },
      { id: "deal_2", title: "Hot water", stage: "scheduled", assignedToId: "user_2" },
    ]);

    render(await CrmEstimatorPage());

    expect(screen.getByText("estimator:ws_1:Blocked drain")).toBeInTheDocument();
    expect(screen.queryByText(/Hot water/)).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users", async () => {
    requireCurrentWorkspaceAccess.mockRejectedValue(new Error("Unauthorized"));

    await expect(CrmEstimatorPage()).rejects.toThrow("REDIRECT:/auth");
  });
});
