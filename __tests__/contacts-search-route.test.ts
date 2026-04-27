import { beforeEach, describe, expect, it, vi } from "vitest";

const { searchContacts } = vi.hoisted(() => ({
  searchContacts: vi.fn(),
}));

vi.mock("@/actions/contact-actions", () => ({
  searchContacts,
}));

import { POST } from "@/app/api/contacts/search/route";

describe("POST /api/contacts/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchContacts.mockResolvedValue([{ id: "contact_1", name: "Jane Citizen" }]);
  });

  it("requires a workspace id", async () => {
    const response = await POST(
      new Request("https://earlymark.ai/api/contacts/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: "", query: "Jane" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "workspaceId is required",
    });
  });

  it("returns empty results when the query is blank", async () => {
    const response = await POST(
      new Request("https://earlymark.ai/api/contacts/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: "ws_1", query: "   " }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ results: [] });
    expect(searchContacts).not.toHaveBeenCalled();
  });

  it("returns matching contacts for valid searches", async () => {
    const response = await POST(
      new Request("https://earlymark.ai/api/contacts/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: "ws_1", query: "Jane" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      results: [{ id: "contact_1", name: "Jane Citizen" }],
    });
    expect(searchContacts).toHaveBeenCalledWith("ws_1", "Jane");
  });

  it("returns a 500 when contact search throws", async () => {
    searchContacts.mockRejectedValue(new Error("search crashed"));

    const response = await POST(
      new Request("https://earlymark.ai/api/contacts/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: "ws_1", query: "Jane" }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Search failed",
    });
  });
});
