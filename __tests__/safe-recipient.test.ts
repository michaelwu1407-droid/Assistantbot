import { afterEach, describe, expect, it } from "vitest"
import {
  SafeRecipientError,
  assertSafeRecipient,
  checkSafeRecipient,
  isOutboundMessagingBlocked,
} from "@/lib/messaging/safe-recipient"

const ORIGINAL = {
  block: process.env.BLOCK_OUTBOUND_MESSAGING,
  allowlist: process.env.OUTBOUND_RECIPIENT_ALLOWLIST,
}

afterEach(() => {
  if (ORIGINAL.block === undefined) delete process.env.BLOCK_OUTBOUND_MESSAGING
  else process.env.BLOCK_OUTBOUND_MESSAGING = ORIGINAL.block
  if (ORIGINAL.allowlist === undefined) delete process.env.OUTBOUND_RECIPIENT_ALLOWLIST
  else process.env.OUTBOUND_RECIPIENT_ALLOWLIST = ORIGINAL.allowlist
})

describe("assertSafeRecipient", () => {
  it("accepts a real E.164 phone number for SMS", () => {
    expect(assertSafeRecipient("sms", "+14155551234")).toBe("+14155551234")
  })

  it("accepts a real email for email", () => {
    expect(assertSafeRecipient("email", "user@earlymark.ai")).toBe("user@earlymark.ai")
  })

  it("rejects an empty target", () => {
    expect(() => assertSafeRecipient("sms", "")).toThrow(SafeRecipientError)
    expect(() => assertSafeRecipient("email", null)).toThrow(SafeRecipientError)
  })

  it("rejects a malformed phone number", () => {
    expect(() => assertSafeRecipient("sms", "0414000000")).toThrow(/E\.164/)
  })

  it("rejects a Twilio magic test number", () => {
    expect(() => assertSafeRecipient("sms", "+15005550006")).toThrow(/magic test/i)
  })

  it("rejects example.com email", () => {
    expect(() => assertSafeRecipient("email", "alice@example.com")).toThrow(/dev\/test domain/)
  })

  it("strips and validates the whatsapp: prefix", () => {
    expect(assertSafeRecipient("whatsapp", "whatsapp:+14155551234")).toBe("whatsapp:+14155551234")
  })

  it("blocks all outbound when BLOCK_OUTBOUND_MESSAGING=true", () => {
    process.env.BLOCK_OUTBOUND_MESSAGING = "true"
    expect(isOutboundMessagingBlocked()).toBe(true)
    expect(() => assertSafeRecipient("sms", "+14155551234")).toThrow(/BLOCK_OUTBOUND_MESSAGING/)
  })

  it("enforces allowlist when OUTBOUND_RECIPIENT_ALLOWLIST is set", () => {
    process.env.OUTBOUND_RECIPIENT_ALLOWLIST = "+14155551234,owner@earlymark.ai"
    expect(assertSafeRecipient("sms", "+14155551234")).toBe("+14155551234")
    expect(assertSafeRecipient("email", "owner@earlymark.ai")).toBe("owner@earlymark.ai")
    expect(() => assertSafeRecipient("sms", "+14155559999")).toThrow(/ALLOWLIST/)
    expect(() => assertSafeRecipient("email", "stranger@earlymark.ai")).toThrow(/ALLOWLIST/)
  })
})

describe("checkSafeRecipient", () => {
  it("returns ok=true for a valid recipient", () => {
    const result = checkSafeRecipient("sms", "+14155551234")
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.target).toBe("+14155551234")
  })

  it("returns ok=false instead of throwing on a bad recipient", () => {
    const result = checkSafeRecipient("email", "alice@example.com")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toMatch(/dev\/test domain/)
  })
})
