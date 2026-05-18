import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  requireCurrentWorkspaceAccess: vi.fn(),
  searchContacts: vi.fn(),
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess: hoisted.requireCurrentWorkspaceAccess,
}));

vi.mock("@/actions/contact-actions", () => ({
  searchContacts: hoisted.searchContacts,
}));

import { POST } from "@/app/api/contacts/search/route";

function jsonRequest(body: unknown): Request {
  return new Request("https://earlymark.ai/api/contacts/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/contacts/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      workspaceId: "ws_session",
      role: "OWNER",
    });
    hoisted.searchContacts.mockResolvedValue([{ id: "contact_1", name: "Jane Citizen" }]);
  });

  it("rejects unauthenticated callers with 401 and runs no query", async () => {
    hoisted.requireCurrentWorkspaceAccess.mockRejectedValue(new Error("Unauthorized"));

    const res = await POST(jsonRequest({ query: "Jane" }));

    expect(res.status).toBe(401);
    expect(hoisted.searchContacts).not.toHaveBeenCalled();
  });

  it("ignores any workspaceId in the body and uses the session workspace", async () => {
    const res = await POST(jsonRequest({ workspaceId: "ws_attacker", query: "Jane" }));

    expect(res.status).toBe(200);
    expect(hoisted.searchContacts).toHaveBeenCalledWith("ws_session", "Jane");
  });

  it("returns empty results when the query is blank without hitting the action", async () => {
    const res = await POST(jsonRequest({ query: "   " }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ results: [] });
    expect(hoisted.searchContacts).not.toHaveBeenCalled();
  });

  it("returns matching contacts for valid searches", async () => {
    const res = await POST(jsonRequest({ query: "Jane" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      results: [{ id: "contact_1", name: "Jane Citizen" }],
    });
  });

  it("returns 500 when the action throws after auth passes", async () => {
    hoisted.searchContacts.mockRejectedValue(new Error("search crashed"));

    const res = await POST(jsonRequest({ query: "Jane" }));

    expect(res.status).toBe(500);
  });
});
