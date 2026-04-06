import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { resolveMx } = vi.hoisted(() => ({
  resolveMx: vi.fn(),
}));

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn(),
}));

vi.mock("node:dns/promises", () => ({
  default: {},
  resolveMx,
}));

vi.mock("@/lib/db", () => ({
  db: {
    webhookEvent: {
      findMany,
    },
  },
}));

import { getInboundLeadEmailReadiness } from "@/lib/inbound-lead-email-readiness";

describe("getInboundLeadEmailReadiness", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    process.env.RESEND_API_KEY = "re_test";
    findMany.mockResolvedValue([]);
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
    expect(result.stage).toBe("reserved");
    expect(result.receivingConfirmed).toBe(false);
  });

  it("returns ready when the exact configured domain has verified inbound receiving", async () => {
    findMany.mockResolvedValue([
      {
        status: "success",
        createdAt: new Date("2026-03-17T01:00:00.000Z"),
      },
      {
        status: "error",
        createdAt: new Date("2026-03-16T01:00:00.000Z"),
      },
    ]);
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
    expect(result.resendDomainStatus).toBe("verified");
    expect(result.resendReceivingEnabled).toBe(true);
    expect(result.resendReceivingRecordStatus).toBe("verified");
    expect(result.dnsReady).toBe(true);
    expect(result.providerVerified).toBe(true);
    expect(result.receivingConfirmed).toBe(true);
    expect(result.stage).toBe("receiving_confirmed");
    expect(result.recentInboundEmailSuccessCount).toBe(1);
    expect(result.recentInboundEmailFailureCount).toBe(1);
    expect(result.lastInboundEmailSuccessAt).toBe("2026-03-17T01:00:00.000Z");
  });

  it("requires a recent successful inbound webhook before marking inbound email ready", async () => {
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
                status: "not_started",
                capabilities: { sending: "disabled", receiving: "enabled" },
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
            status: "not_started",
            capabilities: { sending: "disabled", receiving: "enabled" },
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

    expect(result.ready).toBe(false);
    expect(result.resendDomainStatus).toBe("not_started");
    expect(result.providerVerified).toBe(true);
    expect(result.issues.some((issue) => issue.includes("has not been confirmed by a successful email.received webhook event"))).toBe(true);
  });
});
