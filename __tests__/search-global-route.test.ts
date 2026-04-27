import { beforeEach, describe, expect, it, vi } from "vitest";

const { globalSearch } = vi.hoisted(() => ({
  globalSearch: vi.fn(),
}));

vi.mock("@/actions/search-actions", () => ({
  globalSearch,
}));

import { POST } from "@/app/api/search/global/route";

describe("POST /api/search/global", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalSearch.mockResolvedValue([{ id: "deal_1", type: "deal", label: "Blocked drain" }]);
  });

  it("returns empty results for missing workspace or too-short queries", async () => {
    const response = await POST(
      new Request("https://earlymark.ai/api/search/global", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: "", query: "a" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ results: [] });
    expect(globalSearch).not.toHaveBeenCalled();
  });

  it("returns global search results for valid requests", async () => {
    const response = await POST(
      new Request("https://earlymark.ai/api/search/global", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: "ws_1", query: "blocked drain" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      results: [{ id: "deal_1", type: "deal", label: "Blocked drain" }],
    });
    expect(globalSearch).toHaveBeenCalledWith("ws_1", "blocked drain");
  });

  it("returns a 500 payload with empty results when search fails", async () => {
    globalSearch.mockRejectedValue(new Error("search offline"));

    const response = await POST(
      new Request("https://earlymark.ai/api/search/global", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: "ws_1", query: "blocked drain" }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ results: [] });
  });
});
