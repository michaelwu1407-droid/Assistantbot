import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { notFound, requireContactInCurrentWorkspace, db, getActivities } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  requireContactInCurrentWorkspace: vi.fn(),
  getActivities: vi.fn(),
  db: {
    contact: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("next/navigation", () => ({
  notFound,
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

vi.mock("@/lib/workspace-access", () => ({
  requireContactInCurrentWorkspace,
}));

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("@/actions/activity-actions", () => ({
  getActivities,
}));

vi.mock("@/components/crm/contact-notes", () => ({
  ContactNotes: () => <div>Contact notes</div>,
}));

import ContactDetailPage from "@/app/crm/contacts/[id]/page";

describe("ContactDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireContactInCurrentWorkspace.mockResolvedValue({
      actor: { id: "user_1", workspaceId: "ws_1", role: "OWNER" },
      contact: { id: "contact_1", workspaceId: "ws_1" },
    });
    db.contact.findFirst.mockResolvedValue({
      id: "contact_1",
      name: "Acme Plumbing",
      phone: "0400000001",
      email: "office@acme.com",
      company: "Acme Plumbing",
      address: "1 King St",
      metadata: {},
      deals: [],
      customerFeedback: [],
      syncIssues: [],
    });
    getActivities.mockResolvedValue([]);
  });

  it("renders the contact detail page when scoped access succeeds", async () => {
    render(await ContactDetailPage({ params: Promise.resolve({ id: "contact_1" }) }));

    expect(screen.getByRole("heading", { name: "Acme Plumbing" })).toBeInTheDocument();
    expect(screen.getByText("Contact notes")).toBeInTheDocument();
  });

  it("returns not found when the scoped contact lookup denies access", async () => {
    requireContactInCurrentWorkspace.mockRejectedValue(new Error("Contact not found"));

    await expect(
      ContactDetailPage({ params: Promise.resolve({ id: "contact_1" }) }),
    ).rejects.toThrow("NOT_FOUND");
  });
});
