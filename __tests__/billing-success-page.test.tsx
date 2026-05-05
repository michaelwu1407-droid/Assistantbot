import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const {
  redirect,
  retrieveSession,
  workspaceUpdate,
  workspaceFindUnique,
  userFindUnique,
  ensureWorkspaceProvisioned,
  loggerInfo,
} = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  retrieveSession: vi.fn(),
  workspaceUpdate: vi.fn(),
  workspaceFindUnique: vi.fn(),
  userFindUnique: vi.fn(),
  ensureWorkspaceProvisioned: vi.fn(),
  loggerInfo: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect,
}));

vi.mock("next/dist/client/components/redirect-error", () => ({
  isRedirectError: (error: unknown) =>
    error instanceof Error && error.message.startsWith("REDIRECT:"),
}));

vi.mock("@/components/billing/billing-success-state", () => ({
  BillingSuccessState: ({
    title,
    description,
    detail,
    nextPath,
  }: {
    title: string;
    description: string;
    detail?: string | null;
    nextPath: string;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {detail ? <p>{detail}</p> : null}
      <span>{nextPath}</span>
    </div>
  ),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        retrieve: retrieveSession,
      },
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    workspace: {
      update: workspaceUpdate,
      findUnique: workspaceFindUnique,
    },
    user: {
      findUnique: userFindUnique,
    },
  },
}));

vi.mock("@/lib/onboarding-provision", () => ({
  ensureWorkspaceProvisioned,
}));

vi.mock("@/lib/logging", () => ({
  logger: {
    info: loggerInfo,
  },
}));

import BillingSuccessPage from "@/app/billing/success/page";

function paidSession() {
  return {
    payment_status: "paid",
    client_reference_id: "ws_1",
    customer: "cus_1",
    subscription: {
      id: "sub_1",
      status: "active",
      current_period_end: 1_800_000_000,
      items: {
        data: [{ price: { id: "price_1" } }],
      },
    },
  };
}

describe("BillingSuccessPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workspaceUpdate.mockResolvedValue(undefined);
    workspaceFindUnique.mockResolvedValue({ id: "ws_1", name: "Earlymark Auto", ownerId: "user_1" });
    userFindUnique.mockResolvedValue({ phone: "+61434955958" });
  });

  it("redirects back to billing when session_id is missing", async () => {
    await expect(
      BillingSuccessPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("REDIRECT:/billing");
  });

  it("redirects back to billing when Stripe does not report a paid session", async () => {
    retrieveSession.mockResolvedValue({
      payment_status: "unpaid",
      client_reference_id: "ws_1",
      subscription: null,
    });

    await expect(
      BillingSuccessPage({ searchParams: Promise.resolve({ session_id: "cs_test" }) }),
    ).rejects.toThrow("REDIRECT:/billing");
  });

  it("shows a reassuring success state for fully provisioned workspaces", async () => {
    retrieveSession.mockResolvedValue(paidSession());
    ensureWorkspaceProvisioned.mockResolvedValue({
      success: true,
      provisioningStatus: "provisioned",
      phoneNumber: "+61485010634",
      elapsedMs: 1200,
    });

    render(await BillingSuccessPage({ searchParams: Promise.resolve({ session_id: "cs_test" }) }));

    expect(screen.getByText("Payment confirmed. Tracey is getting ready.")).toBeInTheDocument();
    expect(
      screen.getByText("Your subscription is active and your communication setup is ready. We’ll take you into Earlymark in a moment."),
    ).toBeInTheDocument();
    expect(screen.getByText("Your Earlymark number is +61485010634.")).toBeInTheDocument();
    expect(ensureWorkspaceProvisioned).toHaveBeenCalledWith({
      workspaceId: "ws_1",
      businessName: "Earlymark Auto",
      ownerPhone: "+61434955958",
      triggerSource: "billing-success",
    });
  });

  it("shows a clear next-step message when a phone number was not requested during checkout", async () => {
    retrieveSession.mockResolvedValue(paidSession());
    ensureWorkspaceProvisioned.mockResolvedValue({
      success: false,
      provisioningStatus: "not_requested",
      elapsedMs: 900,
    });

    render(await BillingSuccessPage({ searchParams: Promise.resolve({ session_id: "cs_test" }) }));

    expect(screen.getByText("Payment confirmed. We’re setting up your workspace.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your subscription is active. You can finish onboarding now and add a dedicated number later from billing or settings.",
      ),
    ).toBeInTheDocument();
  });
});
