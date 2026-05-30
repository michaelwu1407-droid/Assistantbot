import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  requireCurrentWorkspaceAccess: vi.fn(),
  db: {
    workspace: { findUnique: vi.fn() },
  },
  redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }),
  getBillingIntervalForPriceId: vi.fn(() => "monthly"),
  getPlanLabelForPriceId: vi.fn(() => "Starter"),
  formatDate: vi.fn((d: Date) => d.toDateString()),
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess: hoisted.requireCurrentWorkspaceAccess,
}));
vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("next/navigation", () => ({ redirect: hoisted.redirect }));
vi.mock("@/lib/billing-plan", () => ({
  getBillingIntervalForPriceId: hoisted.getBillingIntervalForPriceId,
  getPlanLabelForPriceId: hoisted.getPlanLabelForPriceId,
}));
vi.mock("@/lib/format", () => ({ formatDate: hoisted.formatDate }));
vi.mock("@/components/billing/manage-subscription-button", () => ({
  ManageSubscriptionButton: () => <div data-testid="manage-btn" />,
}));
vi.mock("@/components/billing/cancel-subscription-button", () => ({
  CancelSubscriptionButton: () => <div data-testid="cancel-btn" />,
}));

import BillingSettingsPage from "@/app/crm/settings/billing/page";

describe("BillingSettingsPage (bill-11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      role: "OWNER",
      workspaceId: "ws_1",
    });
  });

  it("shows amber post-cancel banner with exact end date when in grace period (bill-11)", async () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    hoisted.formatDate.mockReturnValue("1 Jun 2026");
    hoisted.db.workspace.findUnique.mockResolvedValue({
      id: "ws_1",
      stripePriceId: "price_monthly",
      subscriptionStatus: "canceling",
      stripeCurrentPeriodEnd: futureDate,
    });

    const page = await BillingSettingsPage();
    render(page);

    expect(screen.getByText(/subscription has been cancelled/i)).toBeTruthy();
    expect(screen.getByText(/1 Jun 2026/)).toBeTruthy();
    expect(screen.getByText(/export your data/i)).toBeTruthy();
  });

  it("does not show the banner for an active subscription", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue({
      id: "ws_1",
      stripePriceId: "price_monthly",
      subscriptionStatus: "active",
      stripeCurrentPeriodEnd: null,
    });

    const page = await BillingSettingsPage();
    render(page);

    expect(screen.queryByText(/subscription has been cancelled/i)).toBeNull();
  });
});
