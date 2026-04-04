import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

let currentRole: "OWNER" | "MANAGER" | "TEAM_MEMBER" = "OWNER";

const {
  getTeamMembers,
  getWorkspaceInvites,
  createInvite,
  revokeInvite,
  removeMember,
  updateMemberRole,
} = vi.hoisted(() => ({
  getTeamMembers: vi.fn(),
  getWorkspaceInvites: vi.fn(),
  createInvite: vi.fn(),
  revokeInvite: vi.fn(),
  removeMember: vi.fn(),
  updateMemberRole: vi.fn(),
}));

vi.mock("@/lib/store", () => ({
  useShellStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = { userRole: currentRole };
    return typeof selector === "function" ? selector(state) : state;
  },
}));

vi.mock("@/actions/invite-actions", () => ({
  getTeamMembers,
  getWorkspaceInvites,
  createInvite,
  revokeInvite,
  removeMember,
  updateMemberRole,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import TeamPage from "@/app/crm/team/page";

describe("TeamPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTeamMembers.mockResolvedValue([
      {
        id: "user_1",
        name: "Jess Smith",
        email: "jess@example.com",
        role: "TEAM_MEMBER",
        isCurrentUser: true,
      },
      {
        id: "user_2",
        name: "Michael",
        email: "michael@example.com",
        role: "OWNER",
      },
    ]);
    getWorkspaceInvites.mockResolvedValue([
      {
        id: "invite_1",
        token: "token_1",
        email: "new@example.com",
        role: "TEAM_MEMBER",
        expiresAt: new Date("2026-04-10T00:00:00.000Z"),
      },
    ]);
    currentRole = "OWNER";
  });

  it("shows invite controls for managers", async () => {
    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /invite member/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/pending invites/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open invite link/i })).toHaveAttribute(
      "href",
      "/invite/join?token=token_1",
    );
  });

  it("shows link-only success copy when generating an invite link without email", async () => {
    const user = userEvent.setup();
    createInvite.mockResolvedValue({ success: true, token: "generated_token" });

    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /invite member/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /invite member/i }));
    await user.click(screen.getByRole("button", { name: /generate invite link/i }));

    await waitFor(() => {
      expect(screen.getByText("Invite link ready")).toBeInTheDocument();
    });

    expect(screen.queryByText(/invite sent to !/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Invite sent to\s*!$/)).not.toBeInTheDocument();
  });

  it("hides invite controls and pending invites for team members", async () => {
    currentRole = "TEAM_MEMBER";

    render(<TeamPage />);

    await waitFor(() => {
      expect(screen.getByText(/can't manage invites or roles/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /invite member/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/pending invites/i)).not.toBeInTheDocument();
  });
});
