import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { getAuthUserId, getOrCreateWorkspace, redirect } = vi.hoisted(() => ({
  getAuthUserId: vi.fn(),
  getOrCreateWorkspace: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/auth", () => ({
  getAuthUserId,
}));

vi.mock("@/actions/workspace-actions", () => ({
  getOrCreateWorkspace,
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
    getAuthUserId.mockResolvedValue("user_1");
    getOrCreateWorkspace.mockResolvedValue({ id: "ws_1" });
  });

  it("renders the standalone new booking workflow", async () => {
    render(await NewDealPage());

    expect(screen.getByText("New Booking")).toBeInTheDocument();
    expect(screen.getByText("new-deal-form:ws_1")).toBeInTheDocument();
  });

  it("redirects unauthenticated users", async () => {
    getAuthUserId.mockResolvedValue(null);

    await expect(NewDealPage()).rejects.toThrow("REDIRECT:/auth");
  });
});
