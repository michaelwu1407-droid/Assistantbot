import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { sendSMS, toastSuccess, toastError } = vi.hoisted(() => ({
  sendSMS: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/actions/messaging-actions", () => ({
  sendSMS,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    asChild,
    onClick,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
    onClick?: () => void;
  }) => {
    if (asChild && React.isValidElement(children)) {
      return children;
    }

    return (
      <button type="button" onClick={onClick}>
        {children}
      </button>
    );
  },
  DropdownMenuSeparator: () => <div />,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { ContactHeader } from "@/components/crm/contact-header";

describe("ContactHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const contact = {
    id: "contact_1",
    name: "Sarah Jones",
    email: "sarah@example.com",
    phone: "0400000002",
    company: "Jones Plumbing",
    avatarUrl: null,
    address: null,
    metadata: {},
    dealCount: 1,
    lastActivityDate: null,
    primaryDealStage: null,
    primaryDealStageKey: null,
    primaryDealTitle: null,
    balanceLabel: null,
  };

  it("sends an SMS via Twilio and clears the composer", async () => {
    const user = userEvent.setup();
    sendSMS.mockResolvedValue({ success: true });

    render(<ContactHeader contact={contact as never} />);

    await user.type(screen.getByPlaceholderText("Type your message..."), "On my way");
    await user.click(screen.getByRole("button", { name: "Send direct SMS" }));

    await waitFor(() => {
      expect(sendSMS).toHaveBeenCalledWith("contact_1", "On my way");
    });
    expect(toastSuccess).toHaveBeenCalledWith("SMS sent via Twilio");
    expect(screen.getByPlaceholderText("Type your message...")).toHaveValue("");
  });

  it("renders the native contact actions alongside the shared customer timeline action", () => {
    render(<ContactHeader contact={contact as never} />);

    expect(screen.getByRole("link", { name: /open in email app/i })).toHaveAttribute(
      "href",
      "mailto:sarah@example.com",
    );
    expect(screen.getByRole("link", { name: /call from my phone/i })).toHaveAttribute(
      "href",
      "tel:0400000002",
    );
    expect(screen.getByRole("link", { name: /text from my phone/i })).toHaveAttribute(
      "href",
      "sms:0400000002",
    );
    expect(screen.getByRole("button", { name: /open customer timeline/i })).toBeInTheDocument();
  });

  it("shows a Twilio error when SMS sending fails", async () => {
    const user = userEvent.setup();
    sendSMS.mockResolvedValue({ success: false, error: "Twilio offline" });

    render(<ContactHeader contact={contact as never} />);

    await user.type(screen.getByPlaceholderText("Type your message..."), "Checking in");
    await user.click(screen.getByRole("button", { name: "Send direct SMS" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Twilio offline");
    });
  });

  it("removes the Twilio composer when the contact has no phone number", () => {
    render(
      <ContactHeader
        contact={{
          ...contact,
          phone: null,
        } as never}
      />,
    );

    expect(screen.queryByPlaceholderText("Type your message...")).not.toBeInTheDocument();
    expect(screen.getByText(/Add a phone number before you can send a Twilio SMS from here/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /open customer timeline/i }).length).toBeGreaterThanOrEqual(1);
  });
});
