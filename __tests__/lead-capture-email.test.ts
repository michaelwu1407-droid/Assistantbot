import { describe, expect, it } from "vitest";

import {
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
