import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, getAuthUserId, revalidatePath } = vi.hoisted(() => ({
  db: {
    $transaction: vi.fn(),
    businessProfile: { upsert: vi.fn() },
    pricingSettings: { upsert: vi.fn() },
    user: { update: vi.fn() },
  },
  getAuthUserId: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/auth", () => ({ getAuthUserId }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { saveOnboardingData } from "@/actions/onboarding";

describe("saveOnboardingData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthUserId.mockResolvedValue("user_123");
    db.$transaction.mockResolvedValue(undefined);
  });

  it("validates onboarding input before writing", async () => {
    const result = await saveOnboardingData("ignored", {
      tradeType: "",
      website: "",
      pricingMode: "STANDARD",
      baseSuburb: "Sydney",
      standardWorkHours: "Mon-Fri",
      emergencyService: false,
    } as never);

    expect(result).toEqual({ success: false, error: "Trade type is required" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("requires an authenticated user", async () => {
    getAuthUserId.mockResolvedValue(null);

    const result = await saveOnboardingData("ignored", {
      tradeType: "Plumber",
      website: "",
      pricingMode: "STANDARD",
      callOutFee: 149,
      baseSuburb: "Sydney",
      standardWorkHours: "Mon-Fri, 08:00-17:00",
      emergencyService: true,
      emergencySurcharge: 90,
    });

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("persists business, pricing, and onboarding state in one transaction", async () => {
    await expect(
      saveOnboardingData("ignored", {
        tradeType: "Plumber",
        website: "",
        pricingMode: "BOOK_ONLY",
        callOutFee: 149,
        waiveFee: false,
        menuItems: [{ name: "Blocked drain", price: 350 }],
        baseSuburb: "Parramatta",
        standardWorkHours: "Mon-Fri, 08:00-17:00",
        emergencyService: false,
        emergencySurcharge: 120,
        serviceRadius: 35,
      }),
    ).resolves.toEqual({ success: true });

    expect(db.businessProfile.upsert).toHaveBeenCalledWith({
      where: { userId: "user_123" },
      create: {
        userId: "user_123",
        tradeType: "Plumber",
        website: null,
        baseSuburb: "Parramatta",
        serviceRadius: 35,
        standardWorkHours: "Mon-Fri, 08:00-17:00",
        emergencyService: false,
        emergencySurcharge: null,
      },
      update: {
        tradeType: "Plumber",
        website: null,
        baseSuburb: "Parramatta",
        serviceRadius: 35,
        standardWorkHours: "Mon-Fri, 08:00-17:00",
        emergencyService: false,
        emergencySurcharge: null,
      },
    });
    expect(db.pricingSettings.upsert).toHaveBeenCalledWith({
      where: { userId: "user_123" },
      create: {
        userId: "user_123",
        mode: "BOOK_ONLY",
        callOutFee: null,
        waiveFee: false,
        menuItems: [],
      },
      update: {
        mode: "BOOK_ONLY",
        callOutFee: null,
        waiveFee: false,
        menuItems: [],
      },
    });
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: "user_123" },
      data: { hasOnboarded: true },
    });
    expect(db.$transaction).toHaveBeenCalledWith([
      undefined,
      undefined,
      undefined,
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/crm", "layout");
  });

  it("returns a generic error when the transaction fails", async () => {
    db.$transaction.mockRejectedValue(new Error("db unavailable"));

    const result = await saveOnboardingData("ignored", {
      tradeType: "Plumber",
      website: "",
      pricingMode: "STANDARD",
      callOutFee: 149,
      baseSuburb: "Sydney",
      standardWorkHours: "Mon-Fri, 08:00-17:00",
      emergencyService: false,
    });

    expect(result).toEqual({ success: false, error: "Failed to save onboarding data" });
  });
});
