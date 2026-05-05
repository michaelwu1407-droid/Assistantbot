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

  it("GET rejects cross-workspace access and returns 401 for unauthorized actors", async () => {
    let response = await GET(new NextRequest("https://app.example.com/api/contacts?workspaceId=ws_other"));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden workspace access" });

    hoisted.requireCurrentWorkspaceAccess.mockRejectedValueOnce(new Error("Unauthorized"));
    response = await GET(new NextRequest("https://app.example.com/api/contacts"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
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

  it("POST returns 400 on business failures and 500 on unexpected errors", async () => {
    hoisted.createContact.mockResolvedValueOnce({
      success: false,
      error: "Email already in use",
    });

    let response = await POST(
      new NextRequest("https://app.example.com/api/contacts", {
        method: "POST",
        body: JSON.stringify({ name: "Alex" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Email already in use" });

    hoisted.createContact.mockRejectedValueOnce(new Error("db offline"));
    response = await POST(
      new NextRequest("https://app.example.com/api/contacts", {
        method: "POST",
        body: JSON.stringify({ name: "Alex" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to create contact" });
    expect(hoisted.loggerError).toHaveBeenCalled();
  });
});
