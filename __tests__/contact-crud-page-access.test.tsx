import React from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { redirect, notFound, requireCurrentWorkspaceAccess, getContactsPage, db } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  requireCurrentWorkspaceAccess: vi.fn(),
  getContactsPage: vi.fn(),
  db: {
    contact: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect,
  notFound,
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess,
}));

vi.mock("@/actions/contact-actions", () => ({
  getContactsPage,
}));

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("@/components/crm/contacts-client", () => ({
  ContactsClient: ({ contacts }: { contacts: Array<{ name: string }> }) => (
    <div>
      Contacts client
      {contacts.map((contact) => (
        <span key={contact.name}>{contact.name}</span>
      ))}
    </div>
  ),
}));

vi.mock("@/components/crm/contact-form", () => ({
  ContactForm: ({
    mode,
    workspaceId,
    contact,
  }: {
    mode: "create" | "edit";
    workspaceId?: string;
    contact?: { name: string };
  }) => (
    <div>
      Contact form {mode} {workspaceId ?? contact?.name}
    </div>
  ),
}));

import ContactsPage from "@/app/crm/contacts/page";
import NewContactPage from "@/app/crm/contacts/new/page";
import EditContactPage from "@/app/crm/contacts/[id]/edit/page";

describe("contact CRUD page access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      name: "Owner",
      role: "OWNER",
      workspaceId: "ws_1",
    });
    getContactsPage.mockResolvedValue({
      contacts: [{ id: "contact_1", name: "Acme Plumbing" }],
      page: 1,
      pageSize: 100,
      total: 1,
      hasNextPage: false,
      hasPrevPage: false,
    });
    db.contact.findFirst.mockResolvedValue({
      id: "contact_1",
      name: "Acme Plumbing",
      email: "office@acme.com",
      phone: "0400000001",
      company: "Acme",
      address: "1 King St",
      metadata: {},
    });
  });

  it("lists contacts from the current workspace actor", async () => {
    render(await ContactsPage({ searchParams: Promise.resolve({ page: "2" }) }));

    expect(requireCurrentWorkspaceAccess).toHaveBeenCalled();
    expect(getContactsPage).toHaveBeenCalledWith("ws_1", { page: 2, pageSize: 100 });
    expect(screen.getByText("Contacts client")).toBeInTheDocument();
    expect(screen.getByText("Acme Plumbing")).toBeInTheDocument();
  });

  it("opens the create form with the actor workspace id", async () => {
    render(await NewContactPage());

    expect(requireCurrentWorkspaceAccess).toHaveBeenCalled();
    expect(screen.getByText("Contact form create ws_1")).toBeInTheDocument();
  });

  it("opens the edit form only for contacts in the actor workspace", async () => {
    render(await EditContactPage({ params: Promise.resolve({ id: "contact_1" }) }));

    expect(db.contact.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "contact_1", workspaceId: "ws_1" },
      }),
    );
    expect(screen.getByText("Contact form edit Acme Plumbing")).toBeInTheDocument();
  });

  it("redirects team members away from contact management", async () => {
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_2",
      name: "Tradie",
      role: "TEAM_MEMBER",
      workspaceId: "ws_1",
    });

    await expect(NewContactPage()).rejects.toThrow("REDIRECT:/crm/dashboard");
    await expect(ContactsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      "REDIRECT:/crm/dashboard",
    );
  });

  it("redirects unauthenticated users to auth", async () => {
    requireCurrentWorkspaceAccess.mockRejectedValue(new Error("Unauthorized"));

    await expect(NewContactPage()).rejects.toThrow("REDIRECT:/auth");
  });

  it("returns not found when the scoped edit lookup misses", async () => {
    db.contact.findFirst.mockResolvedValue(null);

    await expect(EditContactPage({ params: Promise.resolve({ id: "missing" }) })).rejects.toThrow(
      "NOT_FOUND",
    );
  });
});
