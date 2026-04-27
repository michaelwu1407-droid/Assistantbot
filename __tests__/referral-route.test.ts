import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
  createReferralLink: vi.fn(),
  getReferralStats: vi.fn(),
  trackReferralClick: vi.fn(),
  getActiveReferralProgram: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthUser: hoisted.getAuthUser,
}));

vi.mock("@/actions/referral-actions", () => ({
  createReferralLink: hoisted.createReferralLink,
  getReferralStats: hoisted.getReferralStats,
  trackReferralClick: hoisted.trackReferralClick,
  getActiveReferralProgram: hoisted.getActiveReferralProgram,
}));

import { GET, POST } from "@/app/api/referral/route";

describe("referral route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getAuthUser.mockResolvedValue({ id: "user_1", email: "miguel@example.com" });
    hoisted.createReferralLink.mockResolvedValue({ referralLink: "https://earlymark.ai/r/abc123" });
    hoisted.getReferralStats.mockResolvedValue({ clicks: 4, signups: 1, rewards: 1 });
    hoisted.getActiveReferralProgram.mockResolvedValue({ id: "program_1", reward: "A$50 credit" });
    hoisted.trackReferralClick.mockResolvedValue({ success: true });
  });

  it("rejects unauthenticated GET requests", async () => {
    hoisted.getAuthUser.mockResolvedValue(null);

    const response = await GET(new NextRequest("https://earlymark.ai/api/referral"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns stats when requested explicitly", async () => {
    const response = await GET(new NextRequest("https://earlymark.ai/api/referral?action=stats"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ clicks: 4, signups: 1, rewards: 1 });
    expect(hoisted.getReferralStats).toHaveBeenCalledWith("user_1");
  });

  it("returns referral link, stats, and active program by default", async () => {
    const response = await GET(new NextRequest("https://earlymark.ai/api/referral"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      referralLink: "https://earlymark.ai/r/abc123",
      stats: { clicks: 4, signups: 1, rewards: 1 },
      program: { id: "program_1", reward: "A$50 credit" },
    });
    expect(hoisted.createReferralLink).toHaveBeenCalledWith({ userId: "user_1" });
  });

  it("creates a referral link from POST create-link", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/referral", {
        method: "POST",
        body: JSON.stringify({ action: "create-link" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      referralLink: "https://earlymark.ai/r/abc123",
    });
  });

  it("tracks referral clicks from POST track-click", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/referral", {
        method: "POST",
        body: JSON.stringify({
          action: "track-click",
          referralCode: "abc123",
          ipAddress: "127.0.0.1",
          userAgent: "Vitest",
          referrer: "https://google.com",
          utmSource: "google",
          utmMedium: "cpc",
          utmCampaign: "launch",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(hoisted.trackReferralClick).toHaveBeenCalledWith({
      referralCode: "abc123",
      ipAddress: "127.0.0.1",
      userAgent: "Vitest",
      referrer: "https://google.com",
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "launch",
    });
  });

  it("rejects invalid POST actions", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/referral", {
        method: "POST",
        body: JSON.stringify({ action: "nope" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid action" });
  });
});
