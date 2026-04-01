import { describe, it, expect, beforeEach, afterEach } from "vitest";

const MONTHLY_PRICE_ID = "price_monthly_test_123";
const YEARLY_PRICE_ID = "price_yearly_test_456";

beforeEach(() => {
  process.env.STRIPE_PRO_MONTHLY_PRICE_ID = MONTHLY_PRICE_ID;
  process.env.STRIPE_PRO_YEARLY_PRICE_ID = YEARLY_PRICE_ID;
});

afterEach(() => {
  delete process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  delete process.env.STRIPE_PRO_YEARLY_PRICE_ID;
});

// Dynamic import so env is set before module-level code runs
async function getModule() {
  const mod = await import("@/lib/billing-plan");
  return mod;
}

describe("getStripePriceIdForInterval", () => {
  it("returns monthly price ID for monthly interval", async () => {
    const { getStripePriceIdForInterval } = await getModule();
    expect(getStripePriceIdForInterval("monthly")).toBe(MONTHLY_PRICE_ID);
  });

  it("returns yearly price ID for yearly interval", async () => {
    const { getStripePriceIdForInterval } = await getModule();
    expect(getStripePriceIdForInterval("yearly")).toBe(YEARLY_PRICE_ID);
  });

  it("throws if STRIPE_PRO_MONTHLY_PRICE_ID is missing", async () => {
    delete process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
    const { getStripePriceIdForInterval } = await getModule();
    expect(() => getStripePriceIdForInterval("monthly")).toThrow("STRIPE_PRO_MONTHLY_PRICE_ID is required");
  });

  it("throws if STRIPE_PRO_YEARLY_PRICE_ID is missing", async () => {
    delete process.env.STRIPE_PRO_YEARLY_PRICE_ID;
    const { getStripePriceIdForInterval } = await getModule();
    expect(() => getStripePriceIdForInterval("yearly")).toThrow("STRIPE_PRO_YEARLY_PRICE_ID is required");
  });
});

describe("getBillingIntervalForPriceId", () => {
  it("returns monthly for the monthly price ID", async () => {
    const { getBillingIntervalForPriceId } = await getModule();
    expect(getBillingIntervalForPriceId(MONTHLY_PRICE_ID)).toBe("monthly");
  });

  it("returns yearly for the yearly price ID", async () => {
    const { getBillingIntervalForPriceId } = await getModule();
    expect(getBillingIntervalForPriceId(YEARLY_PRICE_ID)).toBe("yearly");
  });

  it("returns null for an unknown price ID", async () => {
    const { getBillingIntervalForPriceId } = await getModule();
    expect(getBillingIntervalForPriceId("price_unknown")).toBeNull();
  });

  it("returns null for null input", async () => {
    const { getBillingIntervalForPriceId } = await getModule();
    expect(getBillingIntervalForPriceId(null)).toBeNull();
  });

  it("returns null for undefined input", async () => {
    const { getBillingIntervalForPriceId } = await getModule();
    expect(getBillingIntervalForPriceId(undefined)).toBeNull();
  });
});

describe("getPlanLabelForPriceId", () => {
  it("returns monthly label for monthly price ID", async () => {
    const { getPlanLabelForPriceId } = await getModule();
    expect(getPlanLabelForPriceId(MONTHLY_PRICE_ID)).toBe("Earlymark Pro Monthly");
  });

  it("returns yearly label for yearly price ID", async () => {
    const { getPlanLabelForPriceId } = await getModule();
    expect(getPlanLabelForPriceId(YEARLY_PRICE_ID)).toBe("Earlymark Pro Yearly");
  });

  it("returns generic Pro label for an unknown price ID", async () => {
    const { getPlanLabelForPriceId } = await getModule();
    expect(getPlanLabelForPriceId("price_unknown")).toBe("Earlymark Pro");
  });

  it("returns no subscription label for null", async () => {
    const { getPlanLabelForPriceId } = await getModule();
    expect(getPlanLabelForPriceId(null)).toBe("No active subscription");
  });

  it("returns no subscription label for undefined", async () => {
    const { getPlanLabelForPriceId } = await getModule();
    expect(getPlanLabelForPriceId(undefined)).toBe("No active subscription");
  });
});
