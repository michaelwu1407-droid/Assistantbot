import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { rescheduleDeal, routerRefresh, toastSuccess, toastError } = vi.hoisted(() => ({
  rescheduleDeal: vi.fn(),
  routerRefresh: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/components/crm/deal-detail-modal", () => ({
  DealDetailModal: () => null,
}));

vi.mock("@/lib/crm-selection", () => ({
  publishCrmSelection: vi.fn(),
}));

vi.mock("@/actions/deal-actions", () => ({
  rescheduleDeal,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefresh,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

import { ScheduleCalendar } from "@/app/crm/schedule/schedule-calendar";

describe("ScheduleCalendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rescheduleDeal.mockResolvedValue({
      success: true,
      confirmationSent: false,
      reassigned: false,
      scheduledTimeChanged: false,
    });
  });

  it("hides the team filter and unassigned lane when only one team member is visible", async () => {
    const user = userEvent.setup();
    const scheduledAt = new Date();
    scheduledAt.setHours(9, 0, 0, 0);

    render(
      <ScheduleCalendar
        workspaceTimezone="Australia/Sydney"
        teamMembers={[{ id: "user_1", name: "Jess", email: "jess@example.com", role: "TEAM_MEMBER" }]}
        deals={[
          {
            id: "deal_1",
            title: "Blocked drain",
            address: "12 King St",
            contactName: "Alice",
            assignedToId: "user_1",
            scheduledAt,
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
        workspaceTimezone="Australia/Sydney"
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

  it("shows the backend error instead of a false success when rescheduling fails", async () => {
    const user = userEvent.setup();
    // Fixed reference: 2026-04-05T02:00:00Z = noon AEST (hour 12 in the day view).
    // Using a fixed UTC timestamp avoids timezone-sensitive date-key mismatches between
    // the deal's scheduledAt date key and the calendar's "current" day key.
    const fixedUTC = new Date("2026-04-05T02:00:00.000Z");
    const dataTransfer = {
      store: new Map<string, string>(),
      setData(type: string, value: string) {
        this.store.set(type, value);
      },
      getData(type: string) {
        return this.store.get(type) ?? "";
      },
    };

    rescheduleDeal.mockResolvedValue({
      success: false,
      error: "Set a scheduled date before moving the job to this stage.",
    });

    const { container } = render(
      <ScheduleCalendar
        workspaceTimezone="Australia/Sydney"
        initialDate={fixedUTC}
        teamMembers={[{ id: "user_1", name: "Jess", email: "jess@example.com", role: "TEAM_MEMBER" }]}
        deals={[
          {
            id: "deal_1",
            title: "Blocked drain",
            address: "12 King St",
            contactName: "Alice",
            assignedToId: "user_1",
            scheduledAt: fixedUTC,
          } as never,
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "day" }));

    const dragSource = screen.getAllByText("Blocked drain")[0]?.closest("[draggable='true']");
    const emptyDropCell = container.querySelector(".border-dashed")?.parentElement;

    expect(dragSource).not.toBeNull();
    expect(emptyDropCell).not.toBeNull();

    fireEvent.dragStart(dragSource!, { dataTransfer });
    fireEvent.drop(emptyDropCell!, { dataTransfer });

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Set a scheduled date before moving the job to this stage.");
    });
    expect(toastSuccess).not.toHaveBeenCalled();
    expect(routerRefresh).toHaveBeenCalled();
  });

  it("uses a single reschedule action when moving across team lanes", async () => {
    const user = userEvent.setup();
    // Fixed reference: 2026-04-05T02:00:00Z = noon AEST (hour 12 in the day view).
    const fixedUTC = new Date("2026-04-05T02:00:00.000Z");
    const dataTransfer = {
      store: new Map<string, string>(),
      setData(type: string, value: string) {
        this.store.set(type, value);
      },
      getData(type: string) {
        return this.store.get(type) ?? "";
      },
    };
    rescheduleDeal.mockResolvedValueOnce({
      success: true,
      confirmationSent: false,
      reassigned: true,
      scheduledTimeChanged: false,
    });

    const { container } = render(
      <ScheduleCalendar
        workspaceTimezone="Australia/Sydney"
        initialDate={fixedUTC}
        teamMembers={[
          { id: "user_1", name: "Jess", email: "jess@example.com", role: "TEAM_MEMBER" },
          { id: "user_2", name: "Michael", email: "michael@example.com", role: "OWNER" },
        ]}
        deals={[
          {
            id: "deal_1",
            title: "Blocked drain",
            address: "12 King St",
            contactName: "Alice",
            assignedToId: "user_1",
            scheduledAt: fixedUTC,
          } as never,
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "day" }));

    const dragSource = screen.getAllByText("Blocked drain")[0]?.closest("[draggable='true']");
    const memberRows = Array.from(container.querySelectorAll(".sticky.left-0"));
    const michaelRow = memberRows.find((row) => row.textContent?.includes("Michael"));
    const michaelDropCell = michaelRow?.nextElementSibling as HTMLElement | null;

    expect(dragSource).not.toBeNull();
    expect(michaelDropCell).not.toBeNull();

    fireEvent.dragStart(dragSource!, { dataTransfer });
    fireEvent.drop(michaelDropCell!, { dataTransfer });

    await waitFor(() => expect(rescheduleDeal).toHaveBeenCalledTimes(1));
    expect(rescheduleDeal).toHaveBeenCalledWith(
      "deal_1",
      expect.objectContaining({
        assignedToId: "user_2",
      }),
    );
    expect(toastSuccess).toHaveBeenCalledWith("Job rescheduled and reassigned");
  });

  it("renders scheduled times in the workspace timezone", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-14T23:30:00.000Z"));
    try {
      render(
        <ScheduleCalendar
          workspaceTimezone="Australia/Sydney"
          teamMembers={[{ id: "user_1", name: "Jess", email: "jess@example.com", role: "TEAM_MEMBER" }]}
          deals={[
            {
              id: "deal_1",
              title: "Blocked drain",
              address: "12 King St",
              contactName: "Alice",
              assignedToId: "user_1",
              scheduledAt: new Date("2026-04-14T23:30:00.000Z"),
            } as never,
          ]}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "day" }));

      expect(screen.getAllByText("9:30 AM").length).toBeGreaterThan(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows a real empty state with next steps when nothing is scheduled", () => {
    render(
      <ScheduleCalendar
        workspaceTimezone="Australia/Sydney"
        teamMembers={[{ id: "user_1", name: "Jess", email: "jess@example.com", role: "TEAM_MEMBER" }]}
        deals={[
          {
            id: "deal_1",
            title: "Blocked drain",
            address: "12 King St",
            contactName: "Alice",
            assignedToId: "user_1",
            scheduledAt: null,
          } as never,
        ]}
      />,
    );

    expect(screen.getAllByText(/No jobs are scheduled for this month/i).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/they need a scheduled date before they appear on the calendar/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /open dashboard/i })[0]).toHaveAttribute("href", "/crm/dashboard");
    expect(screen.getAllByRole("link", { name: /create job/i })[0]).toHaveAttribute("href", "/crm/deals/new");
  });

  it("tells the user when a reschedule confirmation was sent to the customer", async () => {
    const user = userEvent.setup();
    const fixedUTC = new Date("2026-04-05T02:00:00.000Z");
    const dataTransfer = {
      store: new Map<string, string>(),
      setData(type: string, value: string) {
        this.store.set(type, value);
      },
      getData(type: string) {
        return this.store.get(type) ?? "";
      },
    };

    rescheduleDeal.mockResolvedValueOnce({
      success: true,
      confirmationSent: true,
      reassigned: false,
      scheduledTimeChanged: true,
    });

    const { container } = render(
      <ScheduleCalendar
        workspaceTimezone="Australia/Sydney"
        initialDate={fixedUTC}
        teamMembers={[{ id: "user_1", name: "Jess", email: "jess@example.com", role: "TEAM_MEMBER" }]}
        deals={[
          {
            id: "deal_1",
            title: "Blocked drain",
            address: "12 King St",
            contactName: "Alice",
            assignedToId: "user_1",
            scheduledAt: fixedUTC,
          } as never,
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "day" }));

    const dragSource = screen.getAllByText("Blocked drain")[0]?.closest("[draggable='true']");
    const emptyDropCell = container.querySelector(".border-dashed")?.parentElement;

    expect(dragSource).not.toBeNull();
    expect(emptyDropCell).not.toBeNull();

    fireEvent.dragStart(dragSource!, { dataTransfer });
    fireEvent.drop(emptyDropCell!, { dataTransfer });

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Job rescheduled. Customer update sent.");
    });
  });
});
