import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { routerRefresh, routerPush, deleteContacts, toastSuccess, toastError } = vi.hoisted(() => ({
  routerRefresh: vi.fn(),
  routerPush: vi.fn(),
  deleteContacts: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefresh,
    push: routerPush,
  }),
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

vi.mock("@/actions/contact-actions", () => ({
  deleteContacts,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

import { ContactsClient } from "@/components/crm/contacts-client";
import type { ContactView } from "@/actions/contact-actions";

const contacts: ContactView[] = [
  {
    id: "contact_1",
    name: "Acme Plumbing",
    email: "office@acme.com",
    phone: "0400000001",
    company: "Acme Plumbing",
    avatarUrl: null,
    address: "1 King St",
    metadata: { tags: ["vip"] },
    dealCount: 2,
    lastActivityDate: new Date("2026-04-02T10:00:00.000Z"),
    primaryDealStage: "Quote sent",
    primaryDealStageKey: "CONTACTED",
    primaryDealTitle: "Blocked Drain",
    balanceLabel: "$420 owed",
  },
  {
    id: "contact_2",
    name: "Sarah Jones",
    email: "sarah@example.com",
    phone: "0400000002",
    company: null,
    avatarUrl: null,
    address: "2 Queen St",
    metadata: {},
    dealCount: 1,
    lastActivityDate: new Date("2026-04-01T08:00:00.000Z"),
    primaryDealStage: "Completed",
    primaryDealStageKey: "WON",
    primaryDealTitle: "Hot Water Service",
    balanceLabel: "Paid",
  },
  {
    id: "contact_3",
    name: "Zen Electrical",
    email: null,
    phone: null,
    company: "Zen Electrical",
    avatarUrl: null,
    address: "3 Collins St",
    metadata: {},
    dealCount: 1,
    lastActivityDate: new Date("2026-03-31T08:00:00.000Z"),
    primaryDealStage: "Deleted",
    primaryDealStageKey: "DELETED",
    primaryDealTitle: "Old Quote",
    balanceLabel: "-",
  },
];

describe("ContactsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteContacts.mockResolvedValue(undefined);
  });

  it("filters contacts by search, type, and selected stages", async () => {
    const user = userEvent.setup();
    render(<ContactsClient contacts={contacts} />);

    expect(screen.getByText("3 contacts")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Acme Plumbing" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sarah Jones" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zen Electrical" })).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search contacts..."), "drain");

    expect(screen.getByRole("link", { name: "Acme Plumbing" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sarah Jones" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Zen Electrical" })).not.toBeInTheDocument();
    expect(screen.getByText("1 contact")).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Search contacts..."));
    await user.click(screen.getByRole("button", { name: /type: all/i }));
    await user.click(screen.getByRole("button", { name: "Business" }));

    expect(screen.getByRole("link", { name: "Acme Plumbing" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Zen Electrical" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sarah Jones" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /stages/i }));
    await user.click(screen.getByRole("button", { name: "None" }));

    expect(screen.getByText("No contacts found. Add your first contact or try a different search.")).toBeInTheDocument();
  }, 15000);

  it("deletes selected contacts and refreshes the list", async () => {
    const user = userEvent.setup();
    const { container } = render(<ContactsClient contacts={contacts} />);

    const table = container.querySelector("table");
    expect(table).not.toBeNull();

    const checkboxes = within(table as HTMLTableElement).getAllByRole("checkbox");
    await user.click(checkboxes[1]);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Delete contacts" }));

    await waitFor(() => {
      expect(deleteContacts).toHaveBeenCalledWith(["contact_1"]);
    });
    expect(toastSuccess).toHaveBeenCalledWith("Deleted 1 contact");
    expect(routerRefresh).toHaveBeenCalled();
  });

  it("shows the visible filtered count in pagination copy", async () => {
    const user = userEvent.setup();
    render(
      <ContactsClient
        contacts={contacts}
        pagination={{ page: 1, pageSize: 100, total: 8, hasNextPage: false, hasPrevPage: false }}
      />,
    );

    expect(screen.getByText("Showing 3 of 8 contacts (page 1)")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Search contacts..."), "drain");

    expect(
      screen.getByText("Matches on this page: 1 of 3 loaded · 8 contacts in workspace · page 1"),
    ).toBeInTheDocument();
  });

  it("surfaces the current job context and quick follow-up actions in one row", () => {
    const { container } = render(<ContactsClient contacts={contacts} />);

    const table = container.querySelector("table");
    expect(table).not.toBeNull();

    const leadRow = screen.getByRole("link", { name: "Acme Plumbing" }).closest("tr");
    expect(leadRow).not.toBeNull();

    const row = within(leadRow as HTMLTableRowElement);
    expect(row.getByText("Blocked Drain")).toBeInTheDocument();
    expect(row.getByText("Quote sent")).toBeInTheDocument();
    expect(row.getByText("$420 owed")).toBeInTheDocument();
    expect(row.getByTitle("Call")).toHaveAttribute("href", "tel:0400000001");
    expect(row.getByTitle("Text")).toHaveAttribute("href", "sms:0400000001");
    expect(row.getByTitle("Email")).toHaveAttribute("href", "mailto:office@acme.com");
  });

  it("surfaces backend delete failures instead of pretending success", async () => {
    const user = userEvent.setup();
    deleteContacts.mockResolvedValue({ success: false, error: "Delete blocked" });
    const { container } = render(<ContactsClient contacts={contacts} />);

    const table = container.querySelector("table");
    expect(table).not.toBeNull();

    const checkboxes = within(table as HTMLTableElement).getAllByRole("checkbox");
    await user.click(checkboxes[1]);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Delete contacts" }));

    await waitFor(() => {
      expect(deleteContacts).toHaveBeenCalledWith(["contact_1"]);
    });
    expect(toastError).toHaveBeenCalledWith("Delete blocked");
    expect(toastSuccess).not.toHaveBeenCalled();
  });
});
