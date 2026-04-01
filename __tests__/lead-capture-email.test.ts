import { describe, expect, it } from "vitest";

import {
  DEFAULT_INBOUND_LEAD_DOMAIN,
  buildLeadCaptureEmail,
  buildLeadCaptureEmailPreview,
  resolveInboundLeadDomain,
  toLeadCaptureAlias,
} from "@/lib/lead-capture-email";

describe("lead capture email helpers", () => {
  it("builds the canonical inbound preview from the business slug", () => {
    expect(buildLeadCaptureEmailPreview("Alexandria Automotive Services")).toBe(
      "alexandria-automotive-services@inbound.earlymark.ai",
    );
  });

  it("falls back to a stable alias when the business name is empty", () => {
    expect(buildLeadCaptureEmailPreview("")).toBe("business@inbound.earlymark.ai");
    expect(toLeadCaptureAlias("")).toBe("business");
  });

  it("honors explicit domains after trimming input", () => {
    expect(resolveInboundLeadDomain(" custom.example.com ")).toBe("custom.example.com");
    expect(buildLeadCaptureEmail("Alexandria Automotive Services", "custom.example.com")).toBe(
      "alexandria-automotive-services@custom.example.com",
    );
  });
});

describe("DEFAULT_INBOUND_LEAD_DOMAIN", () => {
  it("is inbound.earlymark.ai", () => {
    expect(DEFAULT_INBOUND_LEAD_DOMAIN).toBe("inbound.earlymark.ai");
  });
});

describe("resolveInboundLeadDomain", () => {
  it("returns custom domain when provided", () => {
    expect(resolveInboundLeadDomain("custom.example.com")).toBe("custom.example.com");
  });

  it("returns default domain for empty string", () => {
    expect(resolveInboundLeadDomain("")).toBe(DEFAULT_INBOUND_LEAD_DOMAIN);
  });

  it("returns default domain for null", () => {
    expect(resolveInboundLeadDomain(null)).toBe(DEFAULT_INBOUND_LEAD_DOMAIN);
  });

  it("returns default domain for undefined", () => {
    expect(resolveInboundLeadDomain(undefined)).toBe(DEFAULT_INBOUND_LEAD_DOMAIN);
  });
});

describe("toLeadCaptureAlias", () => {
  it("lowercases input", () => {
    expect(toLeadCaptureAlias("AcmePlumbing")).toBe("acmeplumbing");
  });

  it("replaces spaces with hyphens", () => {
    expect(toLeadCaptureAlias("Acme Plumbing Co")).toBe("acme-plumbing-co");
  });

  it("replaces special characters with hyphens", () => {
    expect(toLeadCaptureAlias("Bob's Tiles & Co.")).toBe("bob-s-tiles-co");
  });

  it("collapses consecutive non-alphanumeric chars into one hyphen", () => {
    expect(toLeadCaptureAlias("A--B  C")).toBe("a-b-c");
  });

  it("strips leading and trailing hyphens", () => {
    expect(toLeadCaptureAlias("  !Hello World!  ")).toBe("hello-world");
  });

  it("returns 'business' for null", () => {
    expect(toLeadCaptureAlias(null)).toBe("business");
  });

  it("returns 'business' for only special characters", () => {
    expect(toLeadCaptureAlias("!!!")).toBe("business");
  });
});

describe("buildLeadCaptureEmailPreview", () => {
  it("falls back to default domain for null domain", () => {
    expect(buildLeadCaptureEmailPreview("Acme Plumbing", null)).toBe(
      `acme-plumbing@${DEFAULT_INBOUND_LEAD_DOMAIN}`,
    );
  });

  it("falls back to business alias for null business name", () => {
    expect(buildLeadCaptureEmailPreview(null, null)).toBe(
      `business@${DEFAULT_INBOUND_LEAD_DOMAIN}`,
    );
  });
});
