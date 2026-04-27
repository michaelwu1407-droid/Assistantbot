import { describe, expect, it } from "vitest";
import { isEarlymarkInboundRoomName } from "@/lib/voice-room-routing";

describe("isEarlymarkInboundRoomName", () => {
  it("accepts the legacy earlymark-inbound prefix", () => {
    expect(isEarlymarkInboundRoomName("earlymark-inbound-123")).toBe(true);
  });

  it("accepts the canonical inbound_ prefix", () => {
    expect(isEarlymarkInboundRoomName("inbound_123")).toBe(true);
  });

  it("rejects unrelated room names", () => {
    expect(isEarlymarkInboundRoomName("demo-123")).toBe(false);
    expect(isEarlymarkInboundRoomName("normal-call")).toBe(false);
  });
});
