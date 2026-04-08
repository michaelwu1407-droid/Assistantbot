import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

import TradieEstimatorPage from "@/app/(dashboard)/tradie/estimator/page";

describe("TradieEstimatorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthUser.mockResolvedValue({ id: "user_1" });
    getOrCreateWorkspace.mockResolvedValue({ id: "ws_1" });
    getCurrentUserRole.mockResolvedValue("TEAM_MEMBER");
    getDeals.mockResolvedValue([
      { id: "deal_1", title: "Blocked drain", stage: "scheduled", assignedToId: "user_1" },
      { id: "deal_2", title: "Hot water", stage: "scheduled", assignedToId: "user_2" },
      { id: "deal_3", title: "Deleted", stage: "deleted", assignedToId: "user_1" },
    ]);
  });

  it("renders only the tradie's active assigned deals", async () => {
    render(await TradieEstimatorPage());

    expect(screen.getByText("Tradie Tools")).toBeInTheDocument();
    expect(screen.getByText("estimator:ws_1:Blocked drain")).toBeInTheDocument();
    expect(screen.queryByText(/Hot water/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Deleted/)).not.toBeInTheDocument();
  });

  it("shows an honest empty state when nothing is ready to estimate", async () => {
    getDeals.mockResolvedValue([]);

    render(await TradieEstimatorPage());

    expect(screen.getByText(/No jobs ready to estimate/i)).toBeInTheDocument();
  });
});
