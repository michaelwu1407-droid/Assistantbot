import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateDealStage } = vi.hoisted(() => ({
  updateDealStage: vi.fn(),
}));

vi.mock("@/actions/deal-actions", () => ({
  updateDealStage,
}));

import { POST } from "@/app/api/deals/update-stage/route";

describe("POST /api/deals/update-stage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateDealStage.mockResolvedValue({ success: true, dealId: "deal_1", stage: "SCHEDULED" });
  });

  it("requires both dealId and stage", async () => {
    const response = await POST(
      new Request("https://earlymark.ai/api/deals/update-stage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dealId: "", stage: "" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "dealId and stage are required",
    });
  });

  it("returns success payloads from updateDealStage", async () => {
    const response = await POST(
      new Request("https://earlymark.ai/api/deals/update-stage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dealId: "deal_1", stage: "SCHEDULED" }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      dealId: "deal_1",
      stage: "SCHEDULED",
    });
    expect(updateDealStage).toHaveBeenCalledWith("deal_1", "SCHEDULED");
  });

  it("returns 400 when the action reports a business failure", async () => {
    updateDealStage.mockResolvedValue({ success: false, error: "Cannot move deal" });

    const response = await POST(
      new Request("https://earlymark.ai/api/deals/update-stage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dealId: "deal_1", stage: "LOST" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Cannot move deal",
    });
  });

  it("returns 500 on unexpected errors", async () => {
    updateDealStage.mockRejectedValue(new Error("db offline"));

    const response = await POST(
      new Request("https://earlymark.ai/api/deals/update-stage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dealId: "deal_1", stage: "WON" }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Unable to update deal stage",
    });
  });
});
