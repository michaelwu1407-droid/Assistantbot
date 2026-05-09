import { describe, expect, it } from "vitest";
import {
  isSipCallConnectedStatus,
  isSipCallPendingStatus,
  isSipCallTerminalFailureStatus,
  normalizeSipCallStatus,
  readSipCallStatus,
} from "@/lib/sip-call-status";

describe("sip-call-status helpers", () => {
  it("normalizes status values consistently", () => {
    expect(normalizeSipCallStatus(" In Progress ")).toBe("in_progress");
    expect(normalizeSipCallStatus("")).toBe("");
  });

  it("reads SIP call status from participant attributes", () => {
    expect(readSipCallStatus({ "sip.callStatus": "active" })).toBe("active");
    expect(readSipCallStatus({ "sip.call_status": "busy" })).toBe("busy");
    expect(readSipCallStatus({})).toBeNull();
  });

  it("classifies pending, connected, and failed states", () => {
    expect(isSipCallPendingStatus("dialing")).toBe(true);
    expect(isSipCallConnectedStatus("active")).toBe(true);
    expect(isSipCallConnectedStatus("answered")).toBe(true);
    expect(isSipCallTerminalFailureStatus("busy")).toBe(true);
    expect(isSipCallTerminalFailureStatus("no answer")).toBe(true);
  });
});
