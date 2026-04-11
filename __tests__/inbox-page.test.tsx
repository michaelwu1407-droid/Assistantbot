import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  redirect,
  requireCurrentWorkspaceAccess,
  getActivities,
  getContacts,
  InboxView,
} = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  requireCurrentWorkspaceAccess: vi.fn(),
  getActivities: vi.fn(),
  getContacts: vi.fn(),
  InboxView: vi.fn(
    ({
      initialInteractions,
      contactSegment,
      workspaceId,
      initialContactId,
    }: {
      initialInteractions: unknown[];
      contactSegment: Record<string, "lead" | "existing">;
      workspaceId?: string;
      initialContactId?: string | null;
    }) => (
      <div data-testid="inbox-view">
        {JSON.stringify({
          interactionCount: initialInteractions.length,
          contactSegment,
          workspaceId,
          initialContactId,
        })}
      </div>
    ),
  ),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess,
}));

vi.mock("@/actions/activity-actions", () => ({
  getActivities,
}));

vi.mock("@/actions/contact-actions", () => ({
  getContacts,
}));

vi.mock("@/components/crm/inbox-view", () => ({
  InboxView,
}));

import InboxPage from "@/app/crm/inbox/page";

describe("InboxPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      role: "OWNER",
      workspaceId: "ws_1",
    });
    getActivities.mockResolvedValue([{ id: "activity_1" }]);
    getContacts.mockResolvedValue([
      { id: "contact_1", primaryDealStageKey: "NEW" },
      { id: "contact_2", primaryDealStageKey: "SCHEDULED" },
    ]);
  });

  it("redirects unauthenticated visitors to /login", async () => {
    requireCurrentWorkspaceAccess.mockRejectedValue(new Error("Unauthorized"));

    await expect(InboxPage({})).rejects.toThrow("REDIRECT:/login");
  });

  it("redirects team members to the dashboard instead of the global inbox", async () => {
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_2",
      role: "TEAM_MEMBER",
      workspaceId: "ws_1",
    });

    await expect(InboxPage({})).rejects.toThrow("REDIRECT:/crm/dashboard");
    expect(getActivities).not.toHaveBeenCalled();
  });

  it("passes the selected contact thread into the inbox view for managers", async () => {
    const page = await InboxPage({
      searchParams: Promise.resolve({
        contact: "contact_2",
      }),
    });

    render(page);

    expect(InboxView).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("inbox-view")).toHaveTextContent('"workspaceId":"ws_1"');
    expect(screen.getByTestId("inbox-view")).toHaveTextContent('"initialContactId":"contact_2"');
    expect(screen.getByTestId("inbox-view")).toHaveTextContent('"contact_1":"lead"');
    expect(screen.getByTestId("inbox-view")).toHaveTextContent('"contact_2":"existing"');
  });

  it("shows an unavailable state when inbox data cannot be loaded", async () => {
    getActivities.mockRejectedValue(new Error("db offline"));

    const page = await InboxPage({});
    render(page);

    expect(screen.getByText(/Database connection unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/Could not load inbox/i)).toBeInTheDocument();
    expect(InboxView).not.toHaveBeenCalled();
  });
});
