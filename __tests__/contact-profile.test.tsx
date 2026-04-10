import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
}));

import { ContactProfile } from "@/components/crm/contact-profile";

describe("ContactProfile", () => {
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
    balanceLabel: "Paid",
    deals: [],
  };

  it("keeps native phone and email actions alongside the shared customer timeline", async () => {
    const user = userEvent.setup();
    const originalLocation = window.location;

    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, href: "https://www.earlymark.ai/crm/contacts/contact_1" },
    });

    try {
      render(<ContactProfile contact={contact as never} />);

      expect(screen.getByRole("link", { name: /call from my phone/i })).toHaveAttribute("href", "tel:0400000002");
      expect(screen.getByRole("link", { name: /text from my phone/i })).toHaveAttribute("href", "sms:0400000002");
      expect(screen.getByRole("link", { name: /open in email app/i })).toHaveAttribute(
        "href",
        "mailto:sarah@example.com",
      );

      const timelineButtons = screen.getAllByRole("button", { name: /open customer timeline/i });
      expect(timelineButtons).toHaveLength(2);

      await user.click(timelineButtons[0]);
      expect(window.location.href).toContain("/crm/inbox?contact=contact_1");
    } finally {
      Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
      });
    }
  });

  it("removes native phone and email actions when those details are missing", () => {
    render(
      <ContactProfile
        contact={{
          ...contact,
          phone: null,
          email: null,
        } as never}
      />,
    );

    expect(screen.queryByRole("link", { name: /call from my phone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /text from my phone/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /open in email app/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /open customer timeline/i })).toHaveLength(2);
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });
});
