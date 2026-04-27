import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { sendFollowUpMessage, scheduleFollowUp, toastSuccess, toastError, toastInfo } = vi.hoisted(() => ({
  sendFollowUpMessage: vi.fn(),
  scheduleFollowUp: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock("@/actions/followup-actions", () => ({
  sendFollowUpMessage,
  scheduleFollowUp,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
    info: toastInfo,
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

vi.mock("@/components/ui/select", async () => {
  const React = await import("react");

  const SelectContext = React.createContext<{
    value: string;
    onValueChange?: (value: string) => void;
  }>({ value: "" });

  function Select({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) {
    return (
      <SelectContext.Provider value={{ value, onValueChange }}>
        <div>{children}</div>
      </SelectContext.Provider>
    );
  }

  function SelectTrigger({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
      <button type="button" {...props}>
        {children}
      </button>
    );
  }

  function SelectValue({ placeholder }: { placeholder?: string }) {
    const context = React.useContext(SelectContext);
    return <span>{context.value || placeholder}</span>;
  }

  function SelectContent({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>;
  }

  function SelectItem({
    children,
    disabled,
    value,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    value: string;
  }) {
    const context = React.useContext(SelectContext);
    return (
      <button type="button" disabled={disabled} onClick={() => context.onValueChange?.(value)}>
        {children}
      </button>
    );
  }

  return {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  };
});

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

import { StaleDealFollowUpModal } from "@/components/crm/stale-deal-follow-up-modal";

describe("StaleDealFollowUpModal", () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    sendFollowUpMessage.mockResolvedValue({ success: true });
    scheduleFollowUp.mockResolvedValue({ success: true });
  });

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
    expect(screen.getByRole("link", { name: /add phone in crm/i })).toHaveAttribute(
      "href",
      "/crm/contacts/contact_1/edit",
    );
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
    expect(screen.getByRole("link", { name: /add contact details in crm/i })).toHaveAttribute(
      "href",
      "/crm/contacts/contact_1/edit",
    );
    expect(screen.getByLabelText(/When to call/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^message$/i)).not.toBeInTheDocument();
  });

  it("lets the user pick a template and send a follow-up immediately", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onFollowUpSent = vi.fn();

    render(
      <StaleDealFollowUpModal
        open
        onOpenChange={onOpenChange}
        onFollowUpSent={onFollowUpSent}
        deal={baseDeal}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Gentle Nudge" }));

    expect(screen.getByLabelText(/^message$/i)).toHaveValue(
      "Hi Alex Harper, just following up on Blocked Drain. I wanted to check if you're still interested in moving forward. Let me know if you have any questions!",
    );

    await user.click(screen.getByRole("button", { name: /Send Follow-up/i }));

    await waitFor(() => {
      expect(sendFollowUpMessage).toHaveBeenCalledWith(
        "deal_1",
        expect.stringContaining("just following up on Blocked Drain"),
        "sms",
      );
    });
    expect(toastSuccess).toHaveBeenCalledWith("Follow-up sent via SMS");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onFollowUpSent).toHaveBeenCalled();
  });

  it("lets the user schedule a phone follow-up when they need a reminder instead of sending now", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const onFollowUpSent = vi.fn();

    render(
      <StaleDealFollowUpModal
        open
        onOpenChange={onOpenChange}
        onFollowUpSent={onFollowUpSent}
        deal={baseDeal}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Phone Call \(schedule reminder\)/i }));

    await user.type(screen.getByLabelText(/When to call/i), "2026-04-20T09:30");
    await user.type(screen.getByLabelText(/Call notes/i), "Check whether the quote is still in play.");
    await user.click(screen.getByRole("button", { name: /Schedule Call Reminder/i }));

    await waitFor(() => {
      expect(scheduleFollowUp).toHaveBeenCalledWith(
        "deal_1",
        new Date("2026-04-20T09:30"),
        "Check whether the quote is still in play.",
        "phone",
      );
    });
    expect(toastSuccess).toHaveBeenCalledWith("Phone follow-up scheduled - you'll be reminded on the day");
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onFollowUpSent).toHaveBeenCalled();
  });
});
