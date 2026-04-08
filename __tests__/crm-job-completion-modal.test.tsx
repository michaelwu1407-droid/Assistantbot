import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/actions/messaging-actions", () => ({
  sendReviewRequestSMS: vi.fn(),
}));

vi.mock("@/actions/followup-actions", () => ({
  requestPaymentForDeal: vi.fn(),
}));

import { JobCompletionModal } from "@/components/crm/job-completion-modal";

describe("CRM JobCompletionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes photo follow-up into the full CRM job instead of using dummy local photo state", () => {
    render(
      <JobCompletionModal
        open
        onOpenChange={vi.fn()}
        deal={{
          id: "deal_1",
          title: "Blocked Drain",
          contactName: "Alex Harper",
          value: 250,
          address: "1 Test St, Sydney",
          description: "Drain issue",
        }}
        onComplete={vi.fn()}
      />,
    );

    expect(screen.getByText(/Include job photos in customer follow-up/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Attach and send photos from the full CRM job view so customer history, files, and messaging stay together/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open Full CRM Job/i })).toHaveAttribute("href", "/crm/deals/deal_1");
    expect(screen.queryByLabelText(/send photos to client/i)).not.toBeInTheDocument();
  });
});
