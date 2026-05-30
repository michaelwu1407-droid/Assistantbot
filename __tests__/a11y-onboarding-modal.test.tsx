import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

vi.mock("@/lib/store", () => ({
  useShellStore: vi.fn(() => ({})),
}));

// Trigger the modal by faking localStorage having no "hasSeenOnboarding" flag
beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    value: { getItem: vi.fn().mockReturnValue(null), setItem: vi.fn() },
    writable: true,
  });
});

import { OnboardingModal } from "@/components/dashboard/onboarding-modal";

describe("OnboardingModal — accessibility", () => {
  it("open state (first visit): axe-clean", async () => {
    const { baseElement } = render(<OnboardingModal />);
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });
});
