import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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

import { JobCompletionModal } from "@/components/tradie/job-completion-modal";

describe("Tradie JobCompletionModal", () => {
  it("routes file and photo follow-up into the full CRM job instead of pretending uploads are attached locally", () => {
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

    expect(screen.getByText(/uploading photos and files from this modal is not supported yet/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open full crm job/i })).toHaveAttribute("href", "/crm/deals/deal_99");
    expect(screen.queryByLabelText(/upload photos or files/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /clear all/i })).not.toBeInTheDocument();
  });
});
