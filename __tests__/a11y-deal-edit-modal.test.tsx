import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

const { getDealRecurrence, getTeamMembers, updateDeal } = vi.hoisted(() => ({
  getDealRecurrence: vi.fn(),
  getTeamMembers: vi.fn(),
  updateDeal: vi.fn(),
}));

vi.mock("@/actions/deal-actions", () => ({ getDealRecurrence, updateDeal }));
vi.mock("@/actions/invite-actions", () => ({ getTeamMembers }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Real Dialog primitives — axe evaluates the actual ARIA contract.

import { DealEditModal } from "@/components/crm/deal-edit-modal";

const dealApiResponse = {
  deal: {
    id: "deal_1",
    title: "Blocked Drain",
    value: 450,
    stage: "SCHEDULED",
    address: "1 King St",
    scheduledAt: "2026-05-20T09:00:00.000Z",
    assignedToId: "user_1",
    metadata: { notes: "Check under sink" },
    workspace: { workspaceTimezone: "Australia/Sydney" },
  },
};

describe("DealEditModal — accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDealRecurrence.mockResolvedValue(null);
    getTeamMembers.mockResolvedValue([
      { id: "user_1", name: "Jess Smith", email: "jess@example.com", role: "STAFF" },
    ]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: () => Promise.resolve(dealApiResponse) }),
    );
  });

  it("loading state: axe-clean", async () => {
    const { baseElement } = render(
      <DealEditModal dealId="deal_1" open onOpenChange={vi.fn()} currentUserRole="OWNER" />,
    );
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });

  it("loaded state: axe-clean", async () => {
    const { baseElement } = render(
      <DealEditModal dealId="deal_1" open onOpenChange={vi.fn()} currentUserRole="OWNER" />,
    );
    // Let all fetch + state updates settle
    await vi.waitFor(() => {
      expect(getDealRecurrence).toHaveBeenCalled();
    });
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });
});
