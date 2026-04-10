import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/actions/followup-actions", () => ({
  sendFollowUpMessage: vi.fn(),
  scheduleFollowUp: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({
    children,
    disabled,
    value,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    value: string;
  }) => (
    <div data-value={value} data-disabled={disabled ? "true" : "false"}>
      {children}
    </div>
  ),
}));

import { StaleDealFollowUpModal } from "@/components/crm/stale-deal-follow-up-modal";

describe("StaleDealFollowUpModal", () => {
  const baseDeal = {
    id: "deal_1",
    title: "Blocked Drain",
    contactName: "Alex Harper",
    contactEmail: "alex@example.com",
    contactPhone: "0400000000",
    lastActivity: new Date("2026-04-01T10:00:00+10:00"),
    value: 450,
    stage: "CONTACTED",
  };

  it("defaults away from SMS when the contact only has email", () => {
    render(
      <StaleDealFollowUpModal
        open
        onOpenChange={vi.fn()}
        deal={{
          ...baseDeal,
          contactPhone: undefined,
        }}
      />,
    );

    expect(screen.getAllByText(/No phone/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/^message$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/When to call/i)).not.toBeInTheDocument();
  });

  it("defaults to call reminder guidance when no phone or email is available", () => {
    render(
      <StaleDealFollowUpModal
        open
        onOpenChange={vi.fn()}
        deal={{
          ...baseDeal,
          contactPhone: undefined,
          contactEmail: undefined,
        }}
      />,
    );

    expect(
      screen.getByText(/this follow-up can only be scheduled as a call reminder until contact details are added/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/When to call/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^message$/i)).not.toBeInTheDocument();
  });
});
