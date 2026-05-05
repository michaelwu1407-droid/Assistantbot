import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  retrieveSubscription: vi.fn(),
  db: {
    webhookEvent: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    workspace: {
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
  headers: vi.fn(),
  captureException: vi.fn(),
  processReferralConversionForCheckout: vi.fn(),
  loggerInfo: vi.fn(),
  ensureWorkspaceProvisioned: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: hoisted.constructEvent,
    },
    subscriptions: {
      retrieve: hoisted.retrieveSubscription,
    },
  },
}));
vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("next/headers", () => ({
  headers: hoisted.headers,
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: hoisted.captureException,
}));
vi.mock("@/actions/referral-actions", () => ({
  processReferralConversionForCheckout: hoisted.processReferralConversionForCheckout,
}));
vi.mock("@/lib/logging", () => ({
  logger: {
    info: hoisted.loggerInfo,
  },
}));
vi.mock("@/lib/onboarding-provision", () => ({
  ensureWorkspaceProvisioned: hoisted.ensureWorkspaceProvisioned,
}));
vi.mock("@/lib/idempotency", () => {
  const seen = new Set<string>();
  return {
    runIdempotent: vi.fn(async (params: { actionType: string; parts: unknown[]; resultFactory: () => Promise<unknown> }) => {
      const key = `${params.actionType}|${JSON.stringify(params.parts)}`;
      if (seen.has(key)) {
        return { idempotencyKey: key, created: false, result: null };
      }
      seen.add(key);
      const result = await params.resultFactory();
      return { idempotencyKey: key, created: true, result };
    }),
  };
});

import { POST } from "@/app/api/webhooks/stripe/route";

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.headers.mockResolvedValue({
      get: vi.fn((name: string) => (name === "Stripe-Signature" ? "sig_123" : null)),
    });
    hoisted.db.webhookEvent.create.mockResolvedValue(undefined);
    hoisted.db.webhookEvent.findFirst.mockResolvedValue(null);
    hoisted.db.workspace.update.mockResolvedValue({});
    hoisted.db.workspace.findUnique.mockResolvedValue({
      id: "ws_1",
      name: "Acme Plumbing",
      ownerId: "user_1",
    });
    hoisted.db.user.findUnique.mockResolvedValue({
      phone: "0400000000",
    });
    hoisted.retrieveSubscription.mockResolvedValue({
      id: "sub_123",
      status: "active",
      current_period_end: 1_775_000_000,
      items: {
        data: [{ price: { id: "price_monthly" } }],
      },
    });
    hoisted.ensureWorkspaceProvisioned.mockResolvedValue({
      provisioningStatus: "provisioned",
      elapsedMs: 42,
      phoneNumber: "+61400000000",
    });
  });

  it("rejects invalid signatures and logs a verification_failed webhook event", async () => {
    hoisted.constructEvent.mockImplementation(() => {
      throw new Error("Bad signature");
    });

    const response = await POST(
      new Request("https://app.example.com/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Webhook signature verification failed");
    expect(hoisted.captureException).toHaveBeenCalled();
    expect(hoisted.db.webhookEvent.create).toHaveBeenCalledWith({
      data: {
        provider: "stripe",
        eventType: "verification_failed",
        status: "error",
        error: "Bad signature",
      },
    });
  });

  it("returns 200 immediately for already-processed events", async () => {
    const idempotencyModule = await import("@/lib/idempotency");
    const runIdempotent = idempotencyModule.runIdempotent as unknown as ReturnType<typeof vi.fn>;
    runIdempotent.mockResolvedValueOnce({ idempotencyKey: "k", created: false, result: null });

    hoisted.constructEvent.mockReturnValue({
      id: "evt_duplicate",
      type: "checkout.session.completed",
    });

    const response = await POST(
      new Request("https://app.example.com/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(response.status).toBe(200);
    expect(hoisted.db.workspace.update).not.toHaveBeenCalled();
    expect(hoisted.db.webhookEvent.create).not.toHaveBeenCalled();
  });

  it("processes checkout.session.completed, updates the workspace, applies referrals, provisions, and logs success", async () => {
    hoisted.constructEvent.mockReturnValue({
      id: "evt_checkout",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_123",
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

    const response = await POST(
      new Request("https://app.example.com/api/webhooks/stripe", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(response.status).toBe(200);
    expect(hoisted.db.workspace.update).toHaveBeenCalledWith({
      where: { id: "ws_1" },
      data: expect.objectContaining({
        stripeCustomerId: "cus_123",
        stripeSubscriptionId: "sub_123",
        subscriptionStatus: "active",
        stripePriceId: "price_monthly",
      }),
    });
    expect(hoisted.processReferralConversionForCheckout).toHaveBeenCalledWith(
      "REF123",
      "user_1",
      "ws_1",
    );
    expect(hoisted.ensureWorkspaceProvisioned).toHaveBeenCalledWith({
      workspaceId: "ws_1",
      businessName: "Acme Plumbing",
      ownerPhone: "0400000000",
      triggerSource: "stripe-webhook",
    });
    expect(hoisted.db.webhookEvent.create).toHaveBeenCalledWith({
      data: {
        provider: "stripe",
        eventType: "evt_checkout",
        status: "success",
        payload: {
          id: "evt_checkout",
          type: "checkout.session.completed",
        },
      },
    });
  });
});
