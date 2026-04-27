import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const { push } = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { BillingSuccessState } from "@/components/billing/billing-success-state";

describe("BillingSuccessState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("auto-redirects after a short reassurance delay", async () => {
    render(
      <BillingSuccessState
        title="Payment confirmed"
        description="We’re setting things up."
        nextPath="/auth/next"
      />,
    );

    await vi.advanceTimersByTimeAsync(2500);

    expect(push).toHaveBeenCalledWith("/auth/next");
  });

  it("lets the user continue immediately", async () => {
    render(
      <BillingSuccessState
        title="Payment confirmed"
        description="We’re setting things up."
        detail="Your number is +61485010634."
        nextPath="/auth/next"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /continue now/i }));

    expect(push).toHaveBeenCalledWith("/auth/next");
    expect(screen.getByText("Your number is +61485010634.")).toBeInTheDocument();
  });
});
