import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const {
  redirect,
  requireCurrentWorkspaceAccess,
  getDeals,
  findMany,
} = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  requireCurrentWorkspaceAccess: vi.fn(),
  getDeals: vi.fn(),
  findMany: vi.fn(),
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

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findMany,
    },
  },
}));

vi.mock("@/app/crm/schedule/schedule-calendar", () => ({
  ScheduleCalendar: ({
    deals,
    teamMembers,
  }: {
    deals: Array<{ id: string }>;
    teamMembers: Array<{ id: string; name: string }>;
  }) => (
    <div>
      <div data-testid="deal-ids">{deals.map((deal) => deal.id).join(",")}</div>
      <div data-testid="team-member-ids">{teamMembers.map((member) => member.id).join(",")}</div>
      <div data-testid="team-member-names">{teamMembers.map((member) => member.name).join(",")}</div>
    </div>
  ),
}));

import SchedulePage from "@/app/crm/schedule/page";

describe("SchedulePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      role: "OWNER",
      workspaceId: "ws_1",
    });
    getDeals.mockResolvedValue([
      { id: "deal_1", title: "Blocked drain", stage: "scheduled", assignedToId: "user_1" },
      { id: "deal_2", title: "Hot water", stage: "scheduled", assignedToId: "user_2" },
      { id: "deal_3", title: "Old quote", stage: "deleted", assignedToId: "user_1" },
    ]);
    findMany.mockResolvedValue([
      { id: "user_1", name: null, email: "jess@example.com", role: "TEAM_MEMBER" },
      { id: "user_2", name: "Michael", email: "michael@example.com", role: "OWNER" },
    ]);
  });

  it("shows managers all non-deleted jobs and the full team roster", async () => {
    render(await SchedulePage());

    expect(screen.getByTestId("deal-ids")).toHaveTextContent("deal_1,deal_2");
    expect(screen.getByTestId("team-member-ids")).toHaveTextContent("user_1,user_2");
    expect(screen.getByTestId("team-member-names")).toHaveTextContent("jess,Michael");
  });

  it("shows team members only their own jobs and their own lane", async () => {
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "app_user_1",
      role: "TEAM_MEMBER",
      workspaceId: "ws_1",
    });
    getDeals.mockResolvedValue([
      { id: "deal_1", title: "Blocked drain", stage: "scheduled", assignedToId: "app_user_1" },
      { id: "deal_2", title: "Hot water", stage: "scheduled", assignedToId: "user_2" },
      { id: "deal_3", title: "Old quote", stage: "deleted", assignedToId: "app_user_1" },
    ]);
    findMany.mockResolvedValue([
      { id: "app_user_1", name: null, email: "jess@example.com", role: "TEAM_MEMBER" },
      { id: "user_2", name: "Michael", email: "michael@example.com", role: "OWNER" },
    ]);

    render(await SchedulePage());

    expect(screen.getByTestId("deal-ids")).toHaveTextContent("deal_1");
    expect(screen.getByTestId("team-member-ids")).toHaveTextContent("app_user_1");
    expect(screen.getByTestId("team-member-names")).toHaveTextContent("jess");
  });
});
