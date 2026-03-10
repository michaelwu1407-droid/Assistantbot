export type BillingInterval = "monthly" | "yearly";

export function getStripePriceIdForInterval(interval: BillingInterval): string {
  if (interval === "yearly") {
    const yearlyPriceId = process.env.STRIPE_PRO_YEARLY_PRICE_ID;
    if (!yearlyPriceId) {
      throw new Error("STRIPE_PRO_YEARLY_PRICE_ID is required");
    }

    return yearlyPriceId;
  }

  const monthlyPriceId = process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  if (!monthlyPriceId) {
    throw new Error("STRIPE_PRO_MONTHLY_PRICE_ID is required");
  }

  return monthlyPriceId;
}

export function getBillingIntervalForPriceId(priceId?: string | null): BillingInterval | null {
  if (!priceId) {
    return null;
  }

  if (priceId === process.env.STRIPE_PRO_MONTHLY_PRICE_ID) {
    return "monthly";
  }

  if (priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID) {
    return "yearly";
  }

  return null;
}

export function getPlanLabelForPriceId(priceId?: string | null): string {
  const interval = getBillingIntervalForPriceId(priceId);

  if (interval === "monthly") {
    return "Earlymark Pro Monthly";
  }

  if (interval === "yearly") {
    return "Earlymark Pro Yearly";
  }

  return priceId ? "Earlymark Pro" : "No active subscription";
}
