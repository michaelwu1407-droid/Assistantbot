import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

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

vi.mock("@/lib/store", () => ({
  useShellStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      viewMode: "ADVANCED",
      tutorialStepIndex: 0,
    };
    return typeof selector === "function" ? selector(state) : state;
  },
}));

vi.mock("@/actions/messaging-actions", () => ({
  sendSMS: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { InboxView } from "@/components/crm/inbox-view";

describe("InboxView", () => {
  it("honors an initial contact id and opens that contact thread first", async () => {
    render(
      <InboxView
        workspaceId="ws_1"
        initialContactId="contact_b"
        initialInteractions={[
          {
            id: "activity_1",
            type: "NOTE",
            title: "Inbound",
            description: null,
            time: "1m ago",
            createdAt: new Date("2026-04-03T09:00:00.000Z"),
            contactId: "contact_a",
            contactName: "Alice Example",
            contactPhone: "0400000001",
            contactEmail: "alice@example.com",
            content: "Alice message",
          },
          {
            id: "activity_2",
            type: "NOTE",
            title: "Inbound",
            description: null,
            time: "Just now",
            createdAt: new Date("2026-04-03T10:00:00.000Z"),
            contactId: "contact_b",
            contactName: "Bob Example",
            contactPhone: "0400000002",
            contactEmail: "bob@example.com",
            content: "Bob message",
          },
        ]}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Bob Example" })).toBeInTheDocument();
    });

    expect(screen.getByText("Bob message")).toBeInTheDocument();
  });
});
