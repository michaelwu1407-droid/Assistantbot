import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const {
  redirect,
  getAuthUserId,
  getOrCreateWorkspace,
  getDeals,
  getCurrentUserRole,
} = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  getAuthUserId: vi.fn(),
  getOrCreateWorkspace: vi.fn(),
  getDeals: vi.fn(),
  getCurrentUserRole: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/auth", () => ({
  getAuthUserId,
}));

vi.mock("@/actions/workspace-actions", () => ({
  getOrCreateWorkspace,
}));

vi.mock("@/actions/deal-actions", () => ({
  getDeals,
}));

vi.mock("@/lib/rbac", () => ({
  getCurrentUserRole,
}));

vi.mock("@/components/map/map-page-client", () => ({
  MapPageClient: ({
    jobs,
  }: {
    jobs: Array<{ id: string; title: string }>;
  }) => <div data-testid="map-jobs">{jobs.map((job) => job.id).join(",")}</div>,
}));

import DashboardMapPage from "@/app/crm/map/page";

describe("DashboardMapPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthUserId.mockResolvedValue("user_1");
    getOrCreateWorkspace.mockResolvedValue({ id: "ws_1" });
    getDeals.mockResolvedValue([
      {
        id: "deal_1",
        title: "Blocked drain",
        contactName: "Alice",
        address: "1 King St",
        stage: "SCHEDULED",
        value: 400,
        scheduledAt: new Date("2026-04-04T09:00:00.000Z"),
        assignedToId: "user_1",
      },
      {
        id: "deal_2",
        title: "Hot water",
        contactName: "Bob",
        address: "2 Queen St",
        stage: "SCHEDULED",
        value: 500,
        scheduledAt: new Date("2026-04-04T11:00:00.000Z"),
        assignedToId: "user_2",
      },
    ]);
  });

  it("shows managers the full scheduled roster", async () => {
    getCurrentUserRole.mockResolvedValue("OWNER");

    render(await DashboardMapPage());

    expect(screen.getByTestId("map-jobs")).toHaveTextContent("deal_1,deal_2");
  });

  it("shows team members only their assigned scheduled jobs", async () => {
    getCurrentUserRole.mockResolvedValue("TEAM_MEMBER");

    render(await DashboardMapPage());

    expect(screen.getByTestId("map-jobs")).toHaveTextContent("deal_1");
    expect(screen.getByTestId("map-jobs")).not.toHaveTextContent("deal_2");
  });
});
