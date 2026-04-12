import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  requireCurrentWorkspaceAccess: vi.fn(),
  getContacts: vi.fn(),
  createContact: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess: hoisted.requireCurrentWorkspaceAccess,
}));

vi.mock("@/actions/contact-actions", () => ({
  getContacts: hoisted.getContacts,
  createContact: hoisted.createContact,
}));

vi.mock("@/lib/logging", () => ({
  logger: {
    error: hoisted.loggerError,
  },
}));

import { GET, POST } from "@/app/api/contacts/route";

describe("/api/contacts route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      workspaceId: "ws_1",
      role: "OWNER",
    });
    hoisted.getContacts.mockResolvedValue([]);
    hoisted.createContact.mockResolvedValue({
      success: true,
      contactId: "contact_99",
      merged: false,
      enriched: null,
    });
  });

  it("GET scopes contact list requests to the current workspace", async () => {
    const response = await GET(new NextRequest("https://app.example.com/api/contacts?workspaceId=ws_1&page=2&pageSize=50"));

    expect(response.status).toBe(200);
    expect(hoisted.getContacts).toHaveBeenCalledWith("ws_1", { page: 2, pageSize: 50 });
  });

  it("POST /api/contacts creates contacts through the real action instead of returning a placeholder 501", async () => {
    const request = new NextRequest("https://app.example.com/api/contacts", {
      method: "POST",
      body: JSON.stringify({
        name: "Alex Harper",
        email: "alex@example.com",
        workspaceId: "spoofed_ws",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(hoisted.createContact).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Alex Harper",
        email: "alex@example.com",
        workspaceId: "ws_1",
      })
    );
    expect(payload).toEqual({
      success: true,
      contactId: "contact_99",
      merged: false,
      enriched: null,
    });
  });
});
