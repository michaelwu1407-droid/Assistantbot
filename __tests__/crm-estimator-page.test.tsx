import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { getAuthUser, getOrCreateWorkspace, getCurrentUserRole, getDeals, redirect } = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
  getOrCreateWorkspace: vi.fn(),
  getCurrentUserRole: vi.fn(),
  getDeals: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/auth", () => ({
  getAuthUser,
}));

vi.mock("@/actions/workspace-actions", () => ({
  getOrCreateWorkspace,
}));

vi.mock("@/lib/rbac", () => ({
  getCurrentUserRole,
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
    getAuthUser.mockResolvedValue({ id: "user_1" });
    getOrCreateWorkspace.mockResolvedValue({ id: "ws_1" });
    getCurrentUserRole.mockResolvedValue("OWNER");
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
    getCurrentUserRole.mockResolvedValue("TEAM_MEMBER");
    getDeals.mockResolvedValue([
      { id: "deal_1", title: "Blocked drain", stage: "scheduled", assignedToId: "user_1" },
      { id: "deal_2", title: "Hot water", stage: "scheduled", assignedToId: "user_2" },
    ]);

    render(await CrmEstimatorPage());

    expect(screen.getByText("estimator:ws_1:Blocked drain")).toBeInTheDocument();
    expect(screen.queryByText(/Hot water/)).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users", async () => {
    getAuthUser.mockResolvedValue(null);

    await expect(CrmEstimatorPage()).rejects.toThrow("REDIRECT:/auth");
  });
});
