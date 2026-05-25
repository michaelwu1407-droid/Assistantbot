import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

vi.mock("@/actions/referral-actions", () => ({
  createReferralLink: vi.fn().mockResolvedValue({ referralLink: "https://earlymark.ai/ref/test" }),
  getReferralStats: vi.fn().mockResolvedValue({ totalReferrals: 0, totalClicks: 0, totalSignups: 0, totalConversions: 0 }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ReferralSuccessModal } from "@/components/referral/referral-success-modal";

describe("ReferralSuccessModal — accessibility", () => {
  it("open (onboarding trigger): axe-clean", async () => {
    const { baseElement } = render(
      <ReferralSuccessModal isOpen onClose={vi.fn()} trigger="onboarding" userId="user_1" />,
    );
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });
});
