import { beforeEach, describe, expect, it, vi } from "vitest";

type WorkspaceState = {
  id: string;
  ownerId: string;
  name: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  stripeCurrentPeriodEnd?: Date | null;
  subscriptionStatus: string;
  twilioPhoneNumber: string | null;
  settings: Record<string, unknown>;
};

const {
  db,
  getAuthUserId,
  requireCurrentWorkspaceAccess,
  headersMock,
  cookiesMock,
  redirectMock,
  checkoutSessionCreate,
  constructEvent,
  retrieveSubscription,
  processReferralConversionForCheckout,
  loggerInfo,
  provisionTradieCommsWithFallback,
  captureException,
  getStripePriceIdForInterval,
} = vi.hoisted(() => ({
  db: {
    workspace: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    webhookEvent: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
  getAuthUserId: vi.fn(),
  requireCurrentWorkspaceAccess: vi.fn(),
  headersMock: vi.fn(),
  cookiesMock: vi.fn(),
  redirectMock: vi.fn(),
  checkoutSessionCreate: vi.fn(),
  constructEvent: vi.fn(),
  retrieveSubscription: vi.fn(),
  processReferralConversionForCheckout: vi.fn(),
  loggerInfo: vi.fn(),
  provisionTradieCommsWithFallback: vi.fn(),
  captureException: vi.fn(),
  getStripePriceIdForInterval: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/auth", () => ({ getAuthUserId }));
vi.mock("@/lib/workspace-access", () => ({ requireCurrentWorkspaceAccess }));
vi.mock("next/headers", () => ({
  headers: headersMock,
  cookies: cookiesMock,
}));
vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));
vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: checkoutSessionCreate,
      },
    },
    webhooks: {
      constructEvent,
    },
    subscriptions: {
      retrieve: retrieveSubscription,
    },
  },
}));
vi.mock("@/actions/referral-actions", () => ({
  processReferralConversionForCheckout,
}));
vi.mock("@/lib/logging", () => ({
  logger: {
    info: loggerInfo,
    error: vi.fn(),
  },
}));
vi.mock("@/lib/comms-provision", () => ({
  provisionTradieCommsWithFallback,
}));
vi.mock("@sentry/nextjs", () => ({
  captureException,
}));
vi.mock("@/lib/billing-plan", () => ({
  getStripePriceIdForInterval,
}));

const billingActionsPromise = import("@/actions/billing-actions");
const stripeWebhookRoutePromise = import("@/app/api/webhooks/stripe/route");

describe("integration: billing activation flow", () => {
  let workspace: WorkspaceState;
  let webhookEvents: Array<{ provider: string; eventType: string; status: string; payload?: unknown; error?: string }>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-02T10:00:00.000Z"));

    workspace = {
      id: "ws_1",
      ownerId: "user_1",
      name: "Acme Plumbing",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
      subscriptionStatus: "inactive",
      twilioPhoneNumber: null,
      settings: {},
    };
    webhookEvents = [];

    getAuthUserId.mockResolvedValue("user_1");
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      role: "OWNER",
      workspaceId: "ws_1",
    });
    headersMock.mockResolvedValue({
      get: vi.fn((name: string) => {
        if (name === "origin") return "https://app.example.com";
        if (name === "Stripe-Signature") return "sig_123";
        return null;
      }),
    });
    cookiesMock.mockResolvedValue({
      get: vi.fn((name: string) =>
        name === "referral_code" ? { value: "REF123" } : undefined,
      ),
    });
    redirectMock.mockImplementation((url: string) => {
      throw new Error(`REDIRECT:${url}`);
    });
    getStripePriceIdForInterval.mockReturnValue("price_monthly");
    checkoutSessionCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/session/test_123",
    });
    constructEvent.mockReturnValue({
      id: "evt_checkout",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_123",
          client_reference_id: "ws_1",
          customer: "cus_123",
          subscription: "sub_123",
          payment_status: "paid",
          metadata: {
            referral_code: "REF123",
            referred_user_id: "user_1",
            workspace_id: "ws_1",
          },
        },
      },
    });
    retrieveSubscription.mockResolvedValue({
      id: "sub_123",
      status: "active",
      current_period_end: 1_780_000_000,
      items: {
        data: [{ price: { id: "price_monthly" } }],
      },
    });
    provisionTradieCommsWithFallback.mockImplementation(async () => {
      workspace.twilioPhoneNumber = "+61485010634";
      return {
        success: true,
        phoneNumber: "+61485010634",
        stageReached: "number-purchase",
        mode: "full",
      };
    });

    db.workspace.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === workspace.id) {
        return { ...workspace };
      }
      return null;
    });
    db.workspace.findFirst.mockImplementation(async ({ where }) => {
      if (where.id?.not === workspace.id) {
        return null;
      }
      return null;
    });
    db.workspace.update.mockImplementation(async ({ where, data }) => {
      if (where.id !== workspace.id) return null;
      workspace = {
        ...workspace,
        ...data,
        settings: data.settings ? { ...workspace.settings, ...data.settings } : workspace.settings,
      };
      return { ...workspace };
    });
    db.user.findUnique.mockImplementation(async ({ where }) => {
      if (where.id === "user_1") {
        return { id: "user_1", phone: "0400000000" };
      }
      return null;
    });
    db.user.findMany.mockResolvedValue([{ id: "user_1", email: "owner@example.com", phone: "0400000000", workspaceId: "ws_1" }]);
    db.webhookEvent.findFirst.mockImplementation(async ({ where }) =>
      webhookEvents.find(
        (event) =>
          event.provider === where.provider &&
          event.eventType === where.eventType &&
          event.status === where.status,
      ) ?? null,
    );
    db.webhookEvent.create.mockImplementation(async ({ data }) => {
      webhookEvents.push(data);
      return data;
    });
  });

  it("moves a workspace from checkout request to active and provisioned", async () => {
    const { createCheckoutSession } = await billingActionsPromise;
    const { POST } = await stripeWebhookRoutePromise;

    await expect(createCheckoutSession("ws_1", "monthly", true)).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.com/session/test_123",
    );

    expect(workspace.settings).toEqual(
      expect.objectContaining({
        provisionPhoneNumberRequested: true,
        onboardingProvisioningStatus: "requested",
      }),
    );
    expect(checkoutSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          workspace_id: "ws_1",
          referred_user_id: "user_1",
          referral_code: "REF123",
          billing_interval: "monthly",
        }),
        success_url: "https://app.example.com/billing/success?session_id={CHECKOUT_SESSION_ID}",
      }),
    );

    const response = await POST(
      new Request("https://app.example.com/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(response.status).toBe(200);
    expect(workspace).toEqual(
      expect.objectContaining({
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        stripePriceId: "price_monthly",
        subscriptionStatus: "active",
        twilioPhoneNumber: "+61485010634",
      }),
    );
    expect(workspace.settings).toEqual(
      expect.objectContaining({
        provisionPhoneNumberRequested: true,
        onboardingProvisioningStatus: "provisioned",
        onboardingProvisionedNumber: "+61485010634",
        onboardingProvisioningMode: "full",
        onboardingProvisioningStageReached: "number-purchase",
        onboardingProvisioningTriggerSource: "stripe-webhook",
      }),
    );
    expect(processReferralConversionForCheckout).toHaveBeenCalledWith(
      "REF123",
      "user_1",
      "ws_1",
    );
    expect(webhookEvents).toContainEqual({
      provider: "stripe",
      eventType: "evt_checkout",
      status: "success",
      payload: {
        id: "evt_checkout",
        type: "checkout.session.completed",
      },
    });
  });
});
