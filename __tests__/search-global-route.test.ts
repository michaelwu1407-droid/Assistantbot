import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  requireCurrentWorkspaceAccess: vi.fn(),
  globalSearch: vi.fn(),
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess: hoisted.requireCurrentWorkspaceAccess,
}));

vi.mock("@/actions/search-actions", () => ({
  globalSearch: hoisted.globalSearch,
}));

import { POST } from "@/app/api/search/global/route";

function jsonRequest(body: unknown): Request {
  return new Request("https://earlymark.ai/api/search/global", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/search/global", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      workspaceId: "ws_session",
      role: "OWNER",
    });
    hoisted.globalSearch.mockResolvedValue([{ id: "deal_1", type: "deal", label: "Blocked drain" }]);
  });

  it("rejects unauthenticated callers with 401 and runs no query", async () => {
    hoisted.requireCurrentWorkspaceAccess.mockRejectedValue(new Error("Unauthorized"));

    const res = await POST(jsonRequest({ query: "blocked drain" }));

    expect(res.status).toBe(401);
    expect(hoisted.globalSearch).not.toHaveBeenCalled();
  });

  it("ignores any workspaceId in the body and uses the session workspace", async () => {
    const res = await POST(jsonRequest({ workspaceId: "ws_attacker", query: "blocked drain" }));

    expect(res.status).toBe(200);
    expect(hoisted.globalSearch).toHaveBeenCalledWith("ws_session", "blocked drain");
  });

  it("returns empty results for too-short queries without hitting the action", async () => {
    const res = await POST(jsonRequest({ query: "a" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ results: [] });
    expect(hoisted.globalSearch).not.toHaveBeenCalled();
  });

  it("returns search results for valid requests", async () => {
    const res = await POST(jsonRequest({ query: "blocked drain" }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      results: [{ id: "deal_1", type: "deal", label: "Blocked drain" }],
    });
  });

  it("returns 500 with empty results when search fails", async () => {
    hoisted.globalSearch.mockRejectedValue(new Error("search offline"));

    const res = await POST(jsonRequest({ query: "blocked drain" }));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ results: [] });
  });
});
