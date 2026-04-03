import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/components/crm/deal-detail-modal", () => ({
  DealDetailModal: () => null,
}));

vi.mock("@/lib/crm-selection", () => ({
  publishCrmSelection: vi.fn(),
}));

import { ScheduleCalendar } from "@/app/crm/schedule/schedule-calendar";

describe("ScheduleCalendar", () => {
  it("hides the team filter and unassigned lane when only one team member is visible", async () => {
    const user = userEvent.setup();

    render(
      <ScheduleCalendar
        teamMembers={[{ id: "user_1", name: "Jess", email: "jess@example.com", role: "TEAM_MEMBER" }]}
        deals={[
          {
            id: "deal_1",
            title: "Blocked drain",
            address: "12 King St",
            contactName: "Alice",
            assignedToId: "user_1",
            scheduledAt: new Date("2026-04-03T09:00:00.000Z"),
          } as never,
        ]}
      />,
    );

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "day" }));

    expect(screen.queryByText("Unassigned")).not.toBeInTheDocument();
    expect(screen.getAllByText("Jess").length).toBeGreaterThan(0);
  });

  it("keeps the team filter available when multiple team members are visible", () => {
    render(
      <ScheduleCalendar
        teamMembers={[
          { id: "user_1", name: "Jess", email: "jess@example.com", role: "TEAM_MEMBER" },
          { id: "user_2", name: "Michael", email: "michael@example.com", role: "OWNER" },
        ]}
        deals={[] as never[]}
      />,
    );

    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "All Members" })).toBeInTheDocument();
  });
});
