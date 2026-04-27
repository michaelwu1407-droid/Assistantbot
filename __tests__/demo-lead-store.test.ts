import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: {
    demoLead: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  isDatabaseConfigured: true,
}));

vi.mock("@/lib/db", () => ({
  get db() {
    return hoisted.db;
  },
  get isDatabaseConfigured() {
    return hoisted.isDatabaseConfigured;
  },
}));

import {
  markDemoLeadFailed,
  markDemoLeadInitiated,
  persistDemoLeadAttempt,
} from "@/lib/demo-lead-store";

describe("demo-lead-store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.isDatabaseConfigured = true;
  });

  it("creates a PENDING lead with normalized fields", async () => {
    hoisted.db.demoLead.create.mockResolvedValue({ id: "lead_abc" });

    const id = await persistDemoLeadAttempt({
      firstName: "  Michael ",
      lastName: " Wu ",
      phone: " +61434955958 ",
      email: " Michael@Example.com ",
      businessName: " Alexandria Auto ",
      source: "homepage_form",
      ipAddress: "203.0.113.5",
      userAgent: "ua",
    });

    expect(id).toBe("lead_abc");
    expect(hoisted.db.demoLead.create).toHaveBeenCalledWith({
      data: {
        firstName: "Michael",
        lastName: "Wu",
        phone: "+61434955958",
        email: "michael@example.com",
        businessName: "Alexandria Auto",
        source: "homepage_form",
        callStatus: "PENDING",
        ipAddress: "203.0.113.5",
        userAgent: "ua",
      },
      select: { id: true },
    });
  });

  it("returns null and never throws when the database isn't configured", async () => {
    hoisted.isDatabaseConfigured = false;

    const id = await persistDemoLeadAttempt({
      firstName: "A",
      phone: "+61434955958",
    });

    expect(id).toBeNull();
    expect(hoisted.db.demoLead.create).not.toHaveBeenCalled();
  });

  it("returns null and swallows errors when the create call rejects", async () => {
    hoisted.db.demoLead.create.mockRejectedValue(new Error("boom"));

    const id = await persistDemoLeadAttempt({
      firstName: "A",
      phone: "+61434955958",
    });

    expect(id).toBeNull();
  });

  it("marks a lead INITIATED with call metadata", async () => {
    hoisted.db.demoLead.update.mockResolvedValue({});

    await markDemoLeadInitiated("lead_abc", {
      roomName: "demo-1",
      resolvedTrunkId: "ST_real",
      callerNumber: "+61485010634",
      warnings: ["heads up"],
    });

    expect(hoisted.db.demoLead.update).toHaveBeenCalledWith({
      where: { id: "lead_abc" },
      data: {
        callStatus: "INITIATED",
        roomName: "demo-1",
        resolvedTrunkId: "ST_real",
        callerNumber: "+61485010634",
        warnings: ["heads up"],
      },
    });
  });

  it("no-ops markers when leadId is null", async () => {
    await markDemoLeadInitiated(null, { roomName: "demo-1" });
    await markDemoLeadFailed(null, new Error("nope"));
    expect(hoisted.db.demoLead.update).not.toHaveBeenCalled();
  });

  it("truncates long error messages on FAILED to 500 chars", async () => {
    hoisted.db.demoLead.update.mockResolvedValue({});
    const longMessage = "x".repeat(800);

    await markDemoLeadFailed("lead_abc", new Error(longMessage));

    const call = hoisted.db.demoLead.update.mock.calls[0]![0] as {
      data: { callError: string };
    };
    expect(call.data.callError.length).toBe(500);
  });
});
