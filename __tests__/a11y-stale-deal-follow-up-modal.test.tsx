import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

const { sendFollowUpMessage, scheduleFollowUp } = vi.hoisted(() => ({
  sendFollowUpMessage: vi.fn(),
  scheduleFollowUp: vi.fn(),
}));

vi.mock("@/actions/followup-actions", () => ({ sendFollowUpMessage, scheduleFollowUp }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Real Dialog primitives — axe evaluates the actual ARIA contract.

import { StaleDealFollowUpModal } from "@/components/crm/stale-deal-follow-up-modal";

const baseDeal = {
  id: "deal_1",
  title: "Blocked Drain",
  contactId: "contact_1",
  contactName: "Alex Harper",
  contactEmail: "alex@example.com",
  contactPhone: "0400000000",
  lastActivity: new Date("2026-04-01T10:00:00+10:00"),
  value: 450,
  stage: "CONTACTED",
};

describe("StaleDealFollowUpModal — accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendFollowUpMessage.mockResolvedValue({ success: true });
    scheduleFollowUp.mockResolvedValue({ success: true });
  });

  it("sms/email channel (phone + email available): axe-clean", async () => {
    const { baseElement } = render(
      <StaleDealFollowUpModal open onOpenChange={vi.fn()} deal={baseDeal} />,
    );
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });

  it("no-phone fallback (email only): axe-clean", async () => {
    const { baseElement } = render(
      <StaleDealFollowUpModal
        open
        onOpenChange={vi.fn()}
        deal={{ ...baseDeal, contactPhone: undefined }}
      />,
    );
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });

  it("call-reminder-only (no phone or email): axe-clean", async () => {
    const { baseElement } = render(
      <StaleDealFollowUpModal
        open
        onOpenChange={vi.fn()}
        deal={{ ...baseDeal, contactPhone: undefined, contactEmail: undefined }}
      />,
    );
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });
});
