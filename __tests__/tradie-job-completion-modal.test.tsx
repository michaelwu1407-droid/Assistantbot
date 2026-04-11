import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt ?? ""} />,
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/tradie/material-picker", () => ({
  MaterialPicker: ({ trigger }: { trigger: React.ReactNode }) => <div>{trigger}</div>,
}));

vi.mock("@/components/tradie/signature-pad", () => ({
  SignaturePad: () => <div>Signature Pad</div>,
}));

vi.mock("@/components/sms/message-action-sheet", () => ({
  MessageActionSheet: () => null,
}));

vi.mock("@/actions/tradie-actions", () => ({
  completeJob: vi.fn(),
  finalizeJobCompletion: vi.fn(),
  generateQuote: vi.fn(),
}));

vi.mock("@/actions/deal-actions", () => ({
  updateDeal: vi.fn(),
}));

vi.mock("@/actions/accounting-actions", () => ({
  createXeroDraftInvoice: vi.fn(),
}));

import { finalizeJobCompletion, generateQuote } from "@/actions/tradie-actions";
import { updateDeal } from "@/actions/deal-actions";
import { createXeroDraftInvoice } from "@/actions/accounting-actions";
import { JobCompletionModal } from "@/components/tradie/job-completion-modal";

describe("Tradie JobCompletionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes photo follow-up into full job mode instead of pretending uploads happen inside the modal", () => {
    render(
      <JobCompletionModal
        open
        onOpenChange={vi.fn()}
        dealId="deal_99"
        onSuccess={vi.fn()}
        job={{
          id: "deal_99",
          title: "Blocked Drain",
          clientName: "Alex Harper",
          address: "1 Test St, Sydney",
          status: "SCHEDULED",
          value: 320,
          scheduledAt: new Date("2026-04-08T09:00:00+10:00"),
          description: "Drain blockage",
        }}
      />,
    );

    expect(screen.getByText(/capture site photos from full job mode so they save against the right job/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open full job mode/i })).toHaveAttribute("href", "/tradie/jobs/deal_99");
    expect(screen.queryByLabelText(/upload photos or files/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /clear all/i })).not.toBeInTheDocument();
  });

  it("uses clearer next-step copy once the job is completed", async () => {
    const user = userEvent.setup();
    vi.mocked(finalizeJobCompletion).mockResolvedValue({ success: true });
    vi.mocked(generateQuote).mockResolvedValue({ success: true });
    vi.mocked(updateDeal).mockResolvedValue({ success: true });
    vi.mocked(createXeroDraftInvoice).mockResolvedValue({ success: true });

    render(
      <JobCompletionModal
        open
        onOpenChange={vi.fn()}
        dealId="deal_100"
        onSuccess={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /confirm & generate invoice/i }));

    await waitFor(() => {
      expect(screen.getByText(/review the ready-to-send feedback request before it goes out to the client/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /review feedback request/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /i'll do this later/i })).toBeInTheDocument();
  });

  it("does not complete the job or push Xero when local invoice generation fails", async () => {
    const user = userEvent.setup();
    vi.mocked(finalizeJobCompletion).mockResolvedValue({ success: true });
    vi.mocked(generateQuote).mockResolvedValue({ success: false, error: "Invoice database unavailable" });
    vi.mocked(updateDeal).mockResolvedValue({ success: true });
    vi.mocked(createXeroDraftInvoice).mockResolvedValue({ success: true });

    render(
      <JobCompletionModal
        open
        onOpenChange={vi.fn()}
        dealId="deal_101"
        onSuccess={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /confirm & generate invoice/i }));

    await waitFor(() => {
      expect(generateQuote).toHaveBeenCalled();
    });

    expect(updateDeal).not.toHaveBeenCalledWith("deal_101", { stage: "completed" });
    expect(createXeroDraftInvoice).not.toHaveBeenCalled();
    expect(screen.queryByText(/send feedback request/i)).not.toBeInTheDocument();
  });
});
