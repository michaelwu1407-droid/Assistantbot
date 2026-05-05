import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: {
    contact: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    deal: {
      findFirst: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
  },
  enrichFromEmail: vi.fn(),
  evaluateAutomations: vi.fn(),
  requireCurrentWorkspaceAccess: vi.fn(),
  requireContactInCurrentWorkspace: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@/lib/enrichment", () => ({
  enrichFromEmail: hoisted.enrichFromEmail,
}));
vi.mock("@/actions/automation-actions", () => ({
  evaluateAutomations: hoisted.evaluateAutomations,
}));
vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess: hoisted.requireCurrentWorkspaceAccess,
  requireContactInCurrentWorkspace: hoisted.requireContactInCurrentWorkspace,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createContact, deleteContacts, updateContact, updateContactMetadata } from "@/actions/contact-actions";

describe("contact-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      workspaceId: "ws_1",
      role: "OWNER",
    });
    hoisted.requireContactInCurrentWorkspace.mockResolvedValue({
      actor: {
        id: "user_1",
        workspaceId: "ws_1",
        role: "OWNER",
      },
      contact: {
        id: "contact_1",
        workspaceId: "ws_1",
        email: "alex@example.com",
        phone: "0400000000",
      },
    });
    hoisted.enrichFromEmail.mockResolvedValue(null);
    hoisted.db.deal.findFirst.mockResolvedValue({ id: "deal_1" });
  });

  it("merges into an existing matching-name contact instead of creating a duplicate", async () => {
    hoisted.db.contact.findFirst.mockResolvedValue({
      id: "contact_1",
      name: "Alex Smith",
      email: "alex@example.com",
      phone: "0400000000",
      company: "Old Co",
      address: "1 King St",
      metadata: { existing: true },
    });

    const result = await createContact({
      name: "Alex Smith",
      email: "alex@example.com",
      phone: "0400000000",
      company: "New Co",
      workspaceId: "ws_1",
      contactType: "BUSINESS",
    });

    expect(result).toEqual({
      success: true,
      contactId: "contact_1",
      enriched: null,
      merged: true,
    });
    expect(hoisted.db.contact.update).toHaveBeenCalledWith({
      where: { id: "contact_1" },
      data: expect.objectContaining({
        name: "Alex Smith",
        email: "alex@example.com",
        phone: "0400000000",
        company: "New Co",
        metadata: expect.objectContaining({
          existing: true,
          contactType: "BUSINESS",
        }),
      }),
    });
    expect(hoisted.db.contact.create).not.toHaveBeenCalled();
  });

  it("creates a new enriched contact and triggers new_lead automations", async () => {
    hoisted.db.contact.findFirst.mockResolvedValue(null);
    hoisted.enrichFromEmail.mockResolvedValue({
      name: "Acme Plumbing",
      logoUrl: "https://example.com/logo.png",
      domain: "acme.com",
      industry: "Trades",
      size: "small",
      linkedinUrl: "https://linkedin.com/company/acme",
    });
    hoisted.db.contact.create.mockResolvedValue({ id: "contact_2" });

    const result = await createContact({
      name: "Pat Jones",
      email: "pat@acme.com",
      phone: "0411111111",
      workspaceId: "ws_1",
    });

    expect(result).toEqual({
      success: true,
      contactId: "contact_2",
      enriched: expect.objectContaining({
        name: "Acme Plumbing",
      }),
      merged: false,
    });
    expect(hoisted.db.contact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Pat Jones",
        company: "Acme Plumbing",
        avatarUrl: "https://example.com/logo.png",
        workspaceId: "ws_1",
      }),
    });
    expect(hoisted.evaluateAutomations).toHaveBeenCalledWith("ws_1", {
      type: "new_lead",
      contactId: "contact_2",
    });
  });

  it("allows business contacts without phone or email for placeholder CRM records", async () => {
    hoisted.db.contact.findFirst.mockResolvedValue(null);
    hoisted.db.contact.create.mockResolvedValue({ id: "contact_3" });

    const result = await createContact({
      name: "Acme Plumbing",
      workspaceId: "ws_1",
      contactType: "BUSINESS",
    });

    expect(result).toEqual({
      success: true,
      contactId: "contact_3",
      enriched: null,
      merged: false,
    });
    expect(hoisted.db.contact.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Acme Plumbing",
        email: null,
        phone: null,
        workspaceId: "ws_1",
        metadata: expect.objectContaining({
          contactType: "BUSINESS",
        }),
      }),
    });
  });

  it("rejects updates that would remove both phone and email", async () => {
    const result = await updateContact({
      contactId: "contact_1",
      email: "",
      phone: "",
    });

    expect(result).toEqual({
      success: false,
      error: "At least one of phone or email is required.",
    });
    expect(hoisted.db.contact.update).not.toHaveBeenCalled();
  });

  it("rejects contact field edits from team members even if they can view the contact", async () => {
    hoisted.requireContactInCurrentWorkspace.mockResolvedValue({
      actor: {
        id: "user_2",
        workspaceId: "ws_1",
        role: "TEAM_MEMBER",
      },
      contact: {
        id: "contact_1",
        workspaceId: "ws_1",
        email: "alex@example.com",
        phone: "0400000000",
      },
    });

    const result = await updateContact({
      contactId: "contact_1",
      name: "Updated Name",
    });

    expect(result).toEqual({
      success: false,
      error: "Only managers can edit contact details.",
    });
    expect(hoisted.db.contact.update).not.toHaveBeenCalled();
  });

  it("rejects bulk contact deletion for team members", async () => {
    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_2",
      workspaceId: "ws_1",
      role: "TEAM_MEMBER",
    });

    const result = await deleteContacts(["contact_1", "contact_2"]);

    expect(result).toEqual({
      success: false,
      error: "Only managers can delete contacts.",
    });
    expect(hoisted.db.contact.deleteMany).not.toHaveBeenCalled();
  });

  it("logs a visible activity entry when contact notes change", async () => {
    hoisted.requireContactInCurrentWorkspace.mockResolvedValue({
      actor: {
        id: "user_1",
        workspaceId: "ws_1",
        role: "OWNER",
      },
      contact: {
        id: "contact_1",
        workspaceId: "ws_1",
        metadata: { notes: "Old note" },
      },
    });

    const result = await updateContactMetadata("contact_1", { notes: "Updated note" });

    expect(result).toEqual({ success: true });
    expect(hoisted.db.contact.update).toHaveBeenCalledWith({
      where: { id: "contact_1" },
      data: { metadata: { notes: "Updated note" } },
    });
    expect(hoisted.db.deal.findFirst).toHaveBeenCalledWith({
      where: { contactId: "contact_1", workspaceId: "ws_1" },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    expect(hoisted.db.activity.create).toHaveBeenCalledWith({
      data: {
        type: "NOTE",
        title: "Contact note updated",
        content: "Updated note",
        contactId: "contact_1",
        dealId: "deal_1",
        userId: "user_1",
      },
    });
  });
});
