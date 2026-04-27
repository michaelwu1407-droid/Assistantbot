import { describe, expect, it } from "vitest";
import { isEarlymarkInboundRoomName as isAppEarlymarkInboundRoomName } from "@/lib/voice-room-routing";
import { isEarlymarkInboundRoomName as isWorkerEarlymarkInboundRoomName } from "@/livekit-agent/room-routing";

function expectRouting(value: string, expected: boolean) {
  expect(isAppEarlymarkInboundRoomName(value)).toBe(expected);
  expect(isWorkerEarlymarkInboundRoomName(value)).toBe(expected);
}

describe("isEarlymarkInboundRoomName", () => {
  it("accepts the legacy earlymark-inbound prefix", () => {
    expectRouting("earlymark-inbound-123", true);
  });

  it("accepts the canonical inbound_ prefix", () => {
    expectRouting("inbound_123", true);
  });

  it("rejects unrelated room names", () => {
    expectRouting("demo-123", false);
    expectRouting("normal-call", false);
  });
});
