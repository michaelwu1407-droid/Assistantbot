import { describe, expect, it } from "vitest";
import {
  getSyntheticProbeCallerNumbers,
  isSyntheticProbeCaller,
} from "@/lib/voice-monitor-probe-identity";

describe("voice-monitor-probe-identity", () => {
  it("resolves configured probe caller, alert number, and default", () => {
    const numbers = getSyntheticProbeCallerNumbers({
      VOICE_MONITOR_PROBE_CALLER_NUMBER: "+61400000001",
      VOICE_ALERT_SMS_TO: "0400 000 002",
    } as NodeJS.ProcessEnv);

    expect(numbers).toContain("+61400000001");
    expect(numbers).toContain("+61400000002");
    expect(numbers).toContain("+61434955958");
  });

  it("matches a probe caller regardless of formatting", () => {
    const env = { VOICE_MONITOR_PROBE_CALLER_NUMBER: "+61434955958" } as NodeJS.ProcessEnv;
    expect(isSyntheticProbeCaller("0434 955 958", env)).toBe(true);
    expect(isSyntheticProbeCaller("+61434955958", env)).toBe(true);
  });

  it("does not match real customer callers", () => {
    const env = { VOICE_MONITOR_PROBE_CALLER_NUMBER: "+61434955958" } as NodeJS.ProcessEnv;
    expect(isSyntheticProbeCaller("+61468167497", env)).toBe(false);
    expect(isSyntheticProbeCaller(null, env)).toBe(false);
    expect(isSyntheticProbeCaller("", env)).toBe(false);
  });
});
