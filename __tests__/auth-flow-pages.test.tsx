import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  redirect,
  getAuthUserId,
  getOrCreateWorkspace,
} = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  getAuthUserId: vi.fn(),
  getOrCreateWorkspace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("@/lib/auth", () => ({
  getAuthUserId,
}));

vi.mock("@/actions/workspace-actions", () => ({
  getOrCreateWorkspace,
}));

vi.mock("@/components/onboarding/tracey-onboarding", () => ({
  TraceyOnboarding: () => <div data-testid="tracey-onboarding">tracey onboarding</div>,
}));

vi.mock("@/components/billing/upgrade-button", () => ({
  UpgradeButton: ({
    workspaceId,
    initialProvisionPhoneNumberRequested,
  }: {
    workspaceId: string;
    initialProvisionPhoneNumberRequested: boolean;
  }) => (
    <div data-testid="upgrade-button">
      {workspaceId}:{String(initialProvisionPhoneNumberRequested)}
    </div>
  ),
}));

import SetupPage from "@/app/setup/page";
import BillingPaywallPage from "@/app/billing/page";

describe("setup and billing pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects /setup visitors to /auth when unauthenticated", async () => {
    getAuthUserId.mockResolvedValue(null);

    await expect(SetupPage()).rejects.toThrow("REDIRECT:/auth");
  });

  it("renders onboarding on /setup for authenticated users who are not onboarded", async () => {
    getAuthUserId.mockResolvedValue("user_123");
    getOrCreateWorkspace.mockResolvedValue({
      id: "ws_123",
      onboardingComplete: false,
    });

    const page = await SetupPage();
    render(page);

    expect(screen.getByTestId("tracey-onboarding")).toBeInTheDocument();
  });

  it("redirects active subscribers without onboarding from /billing to /setup", async () => {
    getAuthUserId.mockResolvedValue("user_123");
    getOrCreateWorkspace.mockResolvedValue({
      id: "ws_123",
      subscriptionStatus: "active",
      onboardingComplete: false,
      settings: {},
    });

    await expect(BillingPaywallPage()).rejects.toThrow("REDIRECT:/setup");
  });

  it("renders the billing paywall and upgrade CTA when the workspace is unpaid", async () => {
    getAuthUserId.mockResolvedValue("user_123");
    getOrCreateWorkspace.mockResolvedValue({
      id: "ws_123",
      subscriptionStatus: "inactive",
      onboardingComplete: false,
      settings: { provisionPhoneNumberRequested: true },
    });

    const page = await BillingPaywallPage();
    render(page);

    expect(screen.getByText(/Activate your assistant/i)).toBeInTheDocument();
    expect(screen.getByTestId("upgrade-button")).toHaveTextContent("ws_123:true");
  });
});
