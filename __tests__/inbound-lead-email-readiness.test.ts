import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { resolveMx } = vi.hoisted(() => ({
  resolveMx: vi.fn(),
}));

vi.mock("node:dns/promises", () => ({
  default: {},
  resolveMx,
}));

import { getInboundLeadEmailReadiness } from "@/lib/inbound-lead-email-readiness";

describe("getInboundLeadEmailReadiness", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    process.env.RESEND_API_KEY = "re_test";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.RESEND_API_KEY;
  });

  it("marks the configured domain unhealthy when DNS and Resend are not set up", async () => {
    resolveMx.mockRejectedValue(new Error("queryMx ENOTFOUND inbound.earlymark.ai"));
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "root_1",
              name: "earlymark.ai",
              status: "verified",
              capabilities: { sending: "enabled", receiving: "enabled" },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await getInboundLeadEmailReadiness("inbound.earlymark.ai");

    expect(result.ready).toBe(false);
    expect(result.domain).toBe("inbound.earlymark.ai");
    expect(result.issues.some((issue) => issue.includes("no valid MX record"))).toBe(true);
    expect(result.issues.some((issue) => issue.includes("not configured in Resend"))).toBe(true);
  });

  it("returns ready when the exact configured domain has verified inbound receiving", async () => {
    resolveMx.mockResolvedValue([
      {
        exchange: "inbound-smtp.ap-northeast-1.amazonaws.com",
        priority: 10,
      },
    ]);
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                id: "domain_1",
                name: "inbound.earlymark.ai",
                status: "verified",
                capabilities: { sending: "enabled", receiving: "enabled" },
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "domain_1",
            name: "inbound.earlymark.ai",
            status: "verified",
            capabilities: { sending: "enabled", receiving: "enabled" },
            records: [
              {
                record: "Receiving",
                type: "MX",
                value: "inbound-smtp.ap-northeast-1.amazonaws.com",
                status: "verified",
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const result = await getInboundLeadEmailReadiness("inbound.earlymark.ai");

    expect(result.ready).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.resendReceivingEnabled).toBe(true);
    expect(result.resendReceivingRecordStatus).toBe("verified");
  });
});
