import { describe, expect, it } from "vitest";
import { canAutoCallLead } from "@/lib/auto-call-eligibility";

const validWorkspace = {
  autoCallLeads: true,
  voiceEnabled: true,
  agentMode: "EXECUTION",
  twilioPhoneNumber: "+61200000000",
};

describe("canAutoCallLead", () => {
  it("allows the call when every workspace gate is satisfied", () => {
    expect(canAutoCallLead(validWorkspace)).toEqual({ allowed: true, reason: null });
  });

  it("blocks when the tradie has turned auto-call off", () => {
    expect(canAutoCallLead({ ...validWorkspace, autoCallLeads: false })).toEqual({
      allowed: false,
      reason: "auto_call_disabled",
    });
  });

  it("blocks when the workspace voice circuit breaker is tripped", () => {
    expect(canAutoCallLead({ ...validWorkspace, voiceEnabled: false })).toEqual({
      allowed: false,
      reason: "voice_disabled",
    });
  });

  it("blocks when the agent mode is not EXECUTION (DRAFT etc must not auto-act)", () => {
    expect(canAutoCallLead({ ...validWorkspace, agentMode: "DRAFT" })).toEqual({
      allowed: false,
      reason: "agent_mode_not_execution",
    });
    expect(canAutoCallLead({ ...validWorkspace, agentMode: "INFO_ONLY" })).toEqual({
      allowed: false,
      reason: "agent_mode_not_execution",
    });
  });

  it("blocks when the workspace has no Twilio number to dial out from", () => {
    expect(canAutoCallLead({ ...validWorkspace, twilioPhoneNumber: null })).toEqual({
      allowed: false,
      reason: "no_workspace_number",
    });
  });

  it("returns the first failing gate in policy order so logs are deterministic", () => {
    // auto_call_disabled wins over voice/mode/number
    expect(
      canAutoCallLead({
        autoCallLeads: false,
        voiceEnabled: false,
        agentMode: "DRAFT",
        twilioPhoneNumber: null,
      }),
    ).toEqual({ allowed: false, reason: "auto_call_disabled" });
  });
});
