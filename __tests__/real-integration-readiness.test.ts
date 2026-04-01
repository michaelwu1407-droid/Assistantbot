import { describe, expect, it } from "vitest";

import { getAllServiceReadiness, getServiceReadiness } from "@/lib/real-integration-readiness";

describe("real integration readiness", () => {
  it("marks stripe as not ready when webhook config is missing", () => {
    const result = getServiceReadiness(
      {
        STRIPE_SECRET_KEY: "sk_test_123",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_123",
        STRIPE_PRO_MONTHLY_PRICE_ID: "price_monthly",
        STRIPE_PRO_YEARLY_PRICE_ID: "price_yearly",
        NEXT_PUBLIC_APP_URL: "https://staging.example.com",
      },
      "stripe",
    );

    expect(result.ready).toBe(false);
    expect(result.missingRequired).toEqual(["STRIPE_WEBHOOK_SECRET"]);
  });

  it("marks twilio as ready when required webhook-driving config is present", () => {
    const result = getServiceReadiness(
      {
        TWILIO_ACCOUNT_SID: "AC123",
        TWILIO_AUTH_TOKEN: "token",
        TWILIO_PHONE_NUMBER: "+61400000000",
        NEXT_PUBLIC_APP_URL: "https://staging.example.com",
      },
      "twilio",
    );

    expect(result.ready).toBe(true);
    expect(result.missingRequired).toEqual([]);
  });

  it("returns all core services with auth included", () => {
    const result = getAllServiceReadiness({});

    expect(result.map((service) => service.name)).toEqual(["stripe", "twilio", "resend", "livekit", "auth"]);
  });
});
