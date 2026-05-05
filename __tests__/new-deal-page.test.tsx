import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { requireCurrentWorkspaceAccess, redirect } = vi.hoisted(() => ({
  requireCurrentWorkspaceAccess: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess,
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/components/modals/new-deal-modal-standalone", () => ({
  NewDealModalStandalone: ({ workspaceId }: { workspaceId: string }) => <div>new-deal-form:{workspaceId}</div>,
}));

import NewDealPage from "@/app/crm/deals/new/page";

describe("NewDealPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "app_user_1",
      role: "OWNER",
      workspaceId: "ws_1",
    });
  });

  it("renders the standalone new booking workflow", async () => {
    render(await NewDealPage());

    expect(screen.getByText("New Booking")).toBeInTheDocument();
    expect(screen.getByText("new-deal-form:ws_1")).toBeInTheDocument();
  });

  it("redirects unauthenticated users", async () => {
    requireCurrentWorkspaceAccess.mockRejectedValue(new Error("Unauthorized"));

    await expect(NewDealPage()).rejects.toThrow("REDIRECT:/auth");
  });
});
