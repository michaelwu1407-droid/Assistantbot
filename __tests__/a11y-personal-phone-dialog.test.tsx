import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

const { sendPhoneVerificationCode, updatePhoneNumber } = vi.hoisted(() => ({
  sendPhoneVerificationCode: vi.fn(),
  updatePhoneNumber: vi.fn(),
}));

vi.mock("@/actions/phone-settings", () => ({
  sendPhoneVerificationCode,
  updatePhoneNumber,
}));

// Real Dialog primitives — axe evaluates the actual ARIA contract.

import { PersonalPhoneDialog } from "@/components/settings/personal-phone-dialog";

describe("PersonalPhoneDialog — accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendPhoneVerificationCode.mockResolvedValue({ success: true });
    updatePhoneNumber.mockResolvedValue({ success: true });
  });

  it("enter-phone step: axe-clean", async () => {
    const { baseElement } = render(
      <PersonalPhoneDialog
        businessName="ABC Plumbing"
        currentPhone={null}
        open
        onOpenChange={vi.fn()}
      />,
    );
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });

  it("closed state: axe-clean", async () => {
    const { baseElement } = render(
      <PersonalPhoneDialog
        businessName="ABC Plumbing"
        currentPhone="+61400000001"
        open={false}
        onOpenChange={vi.fn()}
      />,
    );
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });
});
