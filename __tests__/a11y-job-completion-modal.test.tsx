import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

const { completeJob, finalizeJobCompletion, generateQuote, updateDeal, createXeroDraftInvoice } = vi.hoisted(() => ({
  completeJob: vi.fn(),
  finalizeJobCompletion: vi.fn(),
  generateQuote: vi.fn(),
  updateDeal: vi.fn(),
  createXeroDraftInvoice: vi.fn(),
}));

vi.mock("@/actions/tradie-actions", () => ({ completeJob, finalizeJobCompletion, generateQuote }));
vi.mock("@/actions/deal-actions", () => ({ updateDeal }));
vi.mock("@/actions/accounting-actions", () => ({ createXeroDraftInvoice }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("next/image", () => ({ default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} /> }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...p }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) => (
    <a href={href} {...p}>{children}</a>
  ),
}));
vi.mock("@/components/sms/message-action-sheet", () => ({
  MessageActionSheet: () => null,
}));
vi.mock("@/components/tradie/material-picker", () => ({
  MaterialPicker: ({ onAdd }: { onAdd: (m: { description: string; price: number }) => void }) => (
    <button type="button" onClick={() => onAdd({ description: "Part", price: 10 })}>
      Add material
    </button>
  ),
}));
vi.mock("@/components/tradie/signature-pad", () => ({
  SignaturePad: ({ onSave }: { onSave: (sig: string) => void }) => (
    <button type="button" onClick={() => onSave("sig_data")}>Sign</button>
  ),
}));

// Real Dialog primitives — axe evaluates the actual ARIA contract.

import { JobCompletionModal } from "@/components/tradie/job-completion-modal";

describe("JobCompletionModal — accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    completeJob.mockResolvedValue({ success: true });
  });

  it("initial state: axe-clean", async () => {
    const { baseElement } = render(
      <JobCompletionModal open dealId="deal_1" onOpenChange={vi.fn()} onSuccess={vi.fn()} />,
    );
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });

  it("closed state: axe-clean", async () => {
    const { baseElement } = render(
      <JobCompletionModal open={false} dealId="deal_1" onOpenChange={vi.fn()} onSuccess={vi.fn()} />,
    );
    const results = await axe(baseElement);
    expect(results).toHaveNoViolations();
  });
});
