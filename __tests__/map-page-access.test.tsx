import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const {
  redirect,
  requireCurrentWorkspaceAccess,
  getDeals,
} = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  requireCurrentWorkspaceAccess: vi.fn(),
  getDeals: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess,
}));

vi.mock("@/actions/deal-actions", () => ({
  getDeals,
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
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      role: "OWNER",
      workspaceId: "ws_1",
    });
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
    render(await DashboardMapPage());

    expect(screen.getByTestId("map-jobs")).toHaveTextContent("deal_1,deal_2");
  });

  it("shows team members only their assigned scheduled jobs", async () => {
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "app_user_1",
      role: "TEAM_MEMBER",
      workspaceId: "ws_1",
    });
    getDeals.mockResolvedValue([
      {
        id: "deal_1",
        title: "Blocked drain",
        contactName: "Alice",
        address: "1 King St",
        stage: "SCHEDULED",
        value: 400,
        scheduledAt: new Date("2026-04-04T09:00:00.000Z"),
        assignedToId: "app_user_1",
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

    render(await DashboardMapPage());

    expect(screen.getByTestId("map-jobs")).toHaveTextContent("deal_1");
    expect(screen.getByTestId("map-jobs")).not.toHaveTextContent("deal_2");
  });

  it("does not pass scheduled jobs without addresses to the route map", async () => {
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
        id: "deal_no_address",
        title: "Missing address",
        contactName: "No Map",
        address: "",
        stage: "SCHEDULED",
        value: 500,
        scheduledAt: new Date("2026-04-04T11:00:00.000Z"),
        assignedToId: "user_1",
      },
    ]);

    render(await DashboardMapPage());

    expect(screen.getByTestId("map-jobs")).toHaveTextContent("deal_1");
    expect(screen.getByTestId("map-jobs")).not.toHaveTextContent("deal_no_address");
  });
});
