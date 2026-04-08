import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { sendSMS, toastSuccess, toastError, toastInfo } = vi.hoisted(() => ({
  sendSMS: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
}));

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
  sendSMS,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
    info: toastInfo,
  },
}));

import { InboxView } from "@/components/crm/inbox-view";

describe("InboxView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it("sends a direct SMS from the selected inbox thread", async () => {
    const user = userEvent.setup();
    sendSMS.mockResolvedValue({ success: true });

    render(
      <InboxView
        workspaceId="ws_1"
        initialInteractions={[
          {
            id: "activity_1",
            type: "NOTE",
            title: "Inbound",
            description: null,
            time: "Just now",
            createdAt: new Date("2026-04-03T10:00:00.000Z"),
            contactId: "contact_a",
            contactName: "Alice Example",
            contactPhone: "0400000001",
            contactEmail: "alice@example.com",
            content: "Can you come this afternoon?",
          },
        ]}
      />,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Alice Example" })).toBeInTheDocument());

    const input = screen.getByPlaceholderText(/Send an SMS to Alice Example yourself/i);
    await user.type(input, "On my way");
    await user.click(screen.getByRole("button", { name: /Send now/i }));

    await waitFor(() => expect(sendSMS).toHaveBeenCalledWith("contact_a", "On my way"));
    expect(toastSuccess).toHaveBeenCalledWith("SMS sent");
  });

  it("shows the backend error when direct SMS fails", async () => {
    const user = userEvent.setup();
    sendSMS.mockResolvedValue({ success: false, error: "Twilio offline" });

    render(
      <InboxView
        workspaceId="ws_1"
        initialInteractions={[
          {
            id: "activity_1",
            type: "NOTE",
            title: "Inbound",
            description: null,
            time: "Just now",
            createdAt: new Date("2026-04-03T10:00:00.000Z"),
            contactId: "contact_a",
            contactName: "Alice Example",
            contactPhone: "0400000001",
            contactEmail: "alice@example.com",
            content: "Can you come this afternoon?",
          },
        ]}
      />,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Alice Example" })).toBeInTheDocument());

    const input = screen.getByPlaceholderText(/Send an SMS to Alice Example yourself/i);
    await user.type(input, "On my way");
    await user.click(screen.getByRole("button", { name: /Send now/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Twilio offline"));
  });

  it("routes Ask Tracey requests through the chat API and clears the draft on success", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "",
      }),
    );

    render(
      <InboxView
        workspaceId="ws_1"
        initialInteractions={[
          {
            id: "activity_1",
            type: "NOTE",
            title: "Inbound",
            description: null,
            time: "Just now",
            createdAt: new Date("2026-04-03T10:00:00.000Z"),
            contactId: "contact_a",
            contactName: "Alice Example",
            contactPhone: "0400000001",
            contactEmail: "alice@example.com",
            content: "Can you come this afternoon?",
          },
        ]}
      />,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Alice Example" })).toBeInTheDocument());

    await user.click(screen.getByRole("tab", { name: /Ask Tracey/i }));
    const input = screen.getByPlaceholderText(/Ask Tracey to reply or update the CRM for Alice Example/i);
    await user.type(input, "Please let them know we'll be there at 3.");
    await user.click(screen.getByRole("button", { name: /Ask Tracey to act/i }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/chat",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }),
      ),
    );
    expect(toastSuccess).toHaveBeenCalledWith("Tracey is handling Alice Example");
  });

  it("shows a clear error when Ask Tracey cannot reach the API", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    render(
      <InboxView
        workspaceId="ws_1"
        initialInteractions={[
          {
            id: "activity_1",
            type: "NOTE",
            title: "Inbound",
            description: null,
            time: "Just now",
            createdAt: new Date("2026-04-03T10:00:00.000Z"),
            contactId: "contact_a",
            contactName: "Alice Example",
            contactPhone: "0400000001",
            contactEmail: "alice@example.com",
            content: "Can you come this afternoon?",
          },
        ]}
      />,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Alice Example" })).toBeInTheDocument());

    await user.click(screen.getByRole("tab", { name: /Ask Tracey/i }));
    const input = screen.getByPlaceholderText(/Ask Tracey to reply or update the CRM for Alice Example/i);
    await user.type(input, "Please let them know we'll be there at 3.");
    await user.click(screen.getByRole("button", { name: /Ask Tracey to act/i }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("Could not reach Tracey. Check your connection and try again."),
    );
  });

  it("keeps separate drafts for direct SMS and Ask Tracey modes", async () => {
    const user = userEvent.setup();

    render(
      <InboxView
        workspaceId="ws_1"
        initialInteractions={[
          {
            id: "activity_1",
            type: "NOTE",
            title: "Inbound",
            description: null,
            time: "Just now",
            createdAt: new Date("2026-04-03T10:00:00.000Z"),
            contactId: "contact_a",
            contactName: "Alice Example",
            contactPhone: "0400000001",
            contactEmail: "alice@example.com",
            content: "Can you come this afternoon?",
          },
        ]}
      />,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Alice Example" })).toBeInTheDocument());

    const directInput = screen.getByPlaceholderText(/Send an SMS to Alice Example yourself/i);
    await user.type(directInput, "Direct note");
    expect(screen.getByRole("button", { name: /Send now/i })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Ask Tracey/i }));
    const traceyInput = screen.getByPlaceholderText(/Ask Tracey to reply or update the CRM for Alice Example/i);
    expect(traceyInput).toHaveValue("");
    await user.type(traceyInput, "Tracey task");
    expect(traceyInput).toHaveValue("Tracey task");

    await user.click(screen.getByRole("tab", { name: /Direct SMS/i }));
    expect(screen.getByPlaceholderText(/Send an SMS to Alice Example yourself/i)).toHaveValue("Direct note");
  });

  it("exposes composer modes as tabs with distinct helper copy for Direct SMS vs Ask Tracey", async () => {
    const user = userEvent.setup();
    render(
      <InboxView
        workspaceId="ws_1"
        initialInteractions={[
          {
            id: "activity_1",
            type: "NOTE",
            title: "Inbound",
            description: null,
            time: "Just now",
            createdAt: new Date("2026-04-03T10:00:00.000Z"),
            contactId: "contact_a",
            contactName: "Alice Example",
            contactPhone: "0400000001",
            contactEmail: "alice@example.com",
            content: "Hi",
          },
        ]}
      />,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Alice Example" })).toBeInTheDocument());

    const traceyTab = screen.getByRole("tab", { name: /Ask Tracey/i });
    const directTab = screen.getByRole("tab", { name: /Direct SMS/i });
    expect(traceyTab).toHaveAttribute("aria-selected", "false");
    expect(directTab).toHaveAttribute("aria-selected", "true");

    expect(screen.getByText(/Direct SMS: sends now from your workspace Twilio number/i)).toBeInTheDocument();
    expect(screen.getByText(/Sends immediately/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send now/i })).toBeInTheDocument();

    await user.click(traceyTab);
    expect(traceyTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText(/Ask Tracey: the AI reads your instruction/i)).toBeInTheDocument();
    expect(screen.getByText(/AI handles next step/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ask Tracey to act/i })).toBeInTheDocument();
  });

  it("keeps calls compact by default and expands to show the full transcript on demand", async () => {
    const user = userEvent.setup();

    render(
      <InboxView
        workspaceId="ws_1"
        initialInteractions={[
          {
            id: "call_1",
            type: "call",
            channel: "call",
            direction: "inbound",
            title: "Customer call",
            description: "Caller asked about moving tomorrow's booking.",
            summary: "Caller asked about moving tomorrow's booking.",
            transcript: "Caller: Hi, can we move tomorrow's booking to Friday morning?\nTracey: I can help with that.",
            content: "Caller: Hi, can we move tomorrow's booking to Friday morning?",
            preview: "Caller asked about moving tomorrow's booking.",
            time: "Just now",
            createdAt: new Date("2026-04-03T10:00:00.000Z"),
            contactId: "contact_a",
            contactName: "Alice Example",
            contactPhone: "0400000001",
            contactEmail: "alice@example.com",
          },
        ]}
      />,
    );

    await waitFor(() => expect(screen.getByRole("heading", { name: "Alice Example" })).toBeInTheDocument());

    expect(screen.getByText(/Caller asked about moving tomorrow's booking/i)).toBeInTheDocument();
    expect(screen.queryByText(/Tracey: I can help with that\./i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Show full transcript/i }));

    expect(screen.getByText(/Tracey: I can help with that\./i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hide full transcript/i })).toBeInTheDocument();
  });
});
