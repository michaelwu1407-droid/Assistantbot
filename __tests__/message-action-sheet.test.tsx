import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { getMessagePreview, sendTemplateMessage } = vi.hoisted(() => ({
  getMessagePreview: vi.fn(),
  sendTemplateMessage: vi.fn(),
}));

vi.mock("@/actions/sms-templates", () => ({
  getMessagePreview,
  sendTemplateMessage,
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

import { MessageActionSheet } from "@/components/sms/message-action-sheet";

describe("MessageActionSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the unavailable reason and disables send when customer SMS cannot be sent", async () => {
    getMessagePreview.mockResolvedValue({
      contactName: "Alex",
      contactPhone: "0400000000",
      contactEmail: "alex@example.com",
      channel: "sms",
      messageBody: "Hi Alex, thanks for today.",
      isActive: true,
      canSend: false,
      unavailableReason: "Your Tracey SMS number is not provisioned yet.",
    });

    render(
      <MessageActionSheet
        open
        onOpenChange={vi.fn()}
        jobId="deal_1"
        triggerEvent="JOB_COMPLETE"
      />,
    );

    expect(await screen.findByText("Your Tracey SMS number is not provisioned yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send SMS/i })).toBeDisabled();
    expect(sendTemplateMessage).not.toHaveBeenCalled();
  });
});
