import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const validateRequest = vi.hoisted(() => vi.fn())
vi.mock("twilio", () => ({ default: { validateRequest } }))

import { verifyTwilioSignature, shouldSkipTwilioSignatureCheck } from "@/lib/twilio/verify-signature"

beforeEach(() => {
  validateRequest.mockReset()
  // Force-enable verification regardless of NODE_ENV.
  vi.stubEnv("NODE_ENV", "production")
  vi.stubEnv("TWILIO_SKIP_SIGNATURE_VERIFICATION", "")
  vi.stubEnv("TWILIO_AUTH_TOKEN", "test-token")
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("verifyTwilioSignature", () => {
  it("returns ok=true when validateRequest accepts the signature", () => {
    validateRequest.mockReturnValue(true)
    const result = verifyTwilioSignature({
      signatureHeader: "abc",
      fullUrl: "https://app.example.com/api/twilio/webhook",
      formParams: { From: "+14155551234" },
    })
    expect(result.ok).toBe(true)
    expect(validateRequest).toHaveBeenCalledWith(
      "test-token",
      "abc",
      "https://app.example.com/api/twilio/webhook",
      { From: "+14155551234" },
    )
  })

  it("rejects with invalid_signature when validateRequest returns false", () => {
    validateRequest.mockReturnValue(false)
    const result = verifyTwilioSignature({
      signatureHeader: "abc",
      fullUrl: "https://app.example.com/x",
      formParams: {},
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("invalid_signature")
  })

  it("rejects with missing_signature when header is empty", () => {
    const result = verifyTwilioSignature({
      signatureHeader: null,
      fullUrl: "https://app.example.com/x",
      formParams: {},
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("missing_signature")
  })

  it("rejects with missing_secret when TWILIO_AUTH_TOKEN is missing", () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", "")
    const result = verifyTwilioSignature({
      signatureHeader: "abc",
      fullUrl: "https://app.example.com/x",
      formParams: {},
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("missing_secret")
  })

  it("skips check in non-production by default", () => {
    vi.stubEnv("NODE_ENV", "development")
    expect(shouldSkipTwilioSignatureCheck()).toBe(true)
    const result = verifyTwilioSignature({
      signatureHeader: null,
      fullUrl: "https://app.example.com/x",
      formParams: {},
    })
    expect(result.ok).toBe(true)
    expect(validateRequest).not.toHaveBeenCalled()
  })

  it("respects TWILIO_SKIP_SIGNATURE_VERIFICATION=true", () => {
    vi.stubEnv("TWILIO_SKIP_SIGNATURE_VERIFICATION", "true")
    expect(shouldSkipTwilioSignatureCheck()).toBe(true)
  })
})
