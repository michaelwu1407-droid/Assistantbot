import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  stripeCheckoutCreate: vi.fn(),
  stripePortalCreate: vi.fn(),
  requireCurrentWorkspaceAccess: vi.fn(),
  db: {
    workspace: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  getStripePriceIdForInterval: vi.fn(),
  headers: vi.fn(),
  cookies: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: hoisted.stripeCheckoutCreate,
      },
    },
    billingPortal: {
      sessions: {
        create: hoisted.stripePortalCreate,
      },
    },
  },
}));
vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess: hoisted.requireCurrentWorkspaceAccess,
}));
vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@/lib/billing-plan", () => ({
  BillingInterval: {
    MONTHLY: "monthly",
    YEARLY: "yearly",
  },
  getStripePriceIdForInterval: hoisted.getStripePriceIdForInterval,
}));
vi.mock("next/headers", () => ({
  headers: hoisted.headers,
  cookies: hoisted.cookies,
}));
vi.mock("next/navigation", () => ({
  redirect: hoisted.redirect,
}));

import { createCheckoutSession, createCustomerPortalSession } from "@/actions/billing-actions";

describe("billing-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "app_user_1",
      role: "OWNER",
      workspaceId: "ws_1",
    });
    hoisted.getStripePriceIdForInterval.mockReturnValue("price_monthly");
    hoisted.headers.mockResolvedValue({
      get: vi.fn((name: string) => {
        if (name === "origin") return "https://app.example.com";
        return null;
      }),
    });
    hoisted.cookies.mockResolvedValue({
      get: vi.fn(() => ({ value: "ref-123" })),
    });
    hoisted.db.workspace.update.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates a Stripe checkout session, updates provisioning flags, and redirects", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue({
      id: "ws_1",
      ownerId: "user_1",
      stripeCustomerId: "cus_123",
      settings: { existing: true },
    });
    hoisted.stripeCheckoutCreate.mockResolvedValue({
      url: "https://checkout.example.com/session_123",
    });

    await expect(createCheckoutSession("ws_1", "monthly", true)).rejects.toThrow(
      "REDIRECT:https://checkout.example.com/session_123",
    );

    expect(hoisted.db.workspace.update).toHaveBeenCalledWith({
      where: { id: "ws_1" },
      data: {
        settings: expect.objectContaining({
          existing: true,
          provisionPhoneNumberRequested: true,
          onboardingProvisioningStatus: "requested",
          onboardingProvisioningError: null,
          onboardingProvisioningRequestedAt: expect.any(String),
          onboardingProvisioningUpdatedAt: expect.any(String),
        }),
      },
    });
    expect(hoisted.stripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_123",
        client_reference_id: "ws_1",
        line_items: [{ price: "price_monthly", quantity: 1 }],
        metadata: expect.objectContaining({
          workspace_id: "ws_1",
          referred_user_id: "app_user_1",
          referral_code: "ref-123",
          billing_interval: "monthly",
        }),
        success_url: "https://app.example.com/billing/success?session_id={CHECKOUT_SESSION_ID}",
        cancel_url: "https://app.example.com/billing",
      }),
    );
  });

  it("opens the billing portal for the workspace owner and redirects back to settings", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue({
      id: "ws_1",
      ownerId: "user_1",
      stripeCustomerId: "cus_123",
    });
    hoisted.stripePortalCreate.mockResolvedValue({
      url: "https://billing.example.com/session_456",
    });

    await expect(createCustomerPortalSession("ws_1")).rejects.toThrow(
      "REDIRECT:https://billing.example.com/session_456",
    );

    expect(hoisted.stripePortalCreate).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "https://app.example.com/crm/settings",
    });
  });

  it("rejects portal access when the workspace is not the actor workspace", async () => {
    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "app_user_1",
      role: "OWNER",
      workspaceId: "ws_other",
    });
    hoisted.db.workspace.findUnique.mockResolvedValue({
      id: "ws_1",
      stripeCustomerId: "cus_123",
    });

    await expect(createCustomerPortalSession("ws_1")).rejects.toThrow("Unauthorized");
    expect(hoisted.stripePortalCreate).not.toHaveBeenCalled();
  });

  it("rejects checkout for team members even inside the workspace", async () => {
    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "app_user_2",
      role: "TEAM_MEMBER",
      workspaceId: "ws_1",
    });

    await expect(createCheckoutSession("ws_1", "monthly", false)).rejects.toThrow("Unauthorized");
    expect(hoisted.stripeCheckoutCreate).not.toHaveBeenCalled();
  });
});
