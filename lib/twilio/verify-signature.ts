import twilio from "twilio"

/**
 * Verify a Twilio webhook signature using the X-Twilio-Signature header.
 *
 * Twilio docs: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 *
 * The signature is HMAC-SHA1 over `${fullUrl}${sortedFormParams}`. Twilio's SDK
 * exposes `validateRequest(authToken, signature, url, params)` which does the
 * compare in constant time.
 *
 * In test/dev or when TWILIO_SKIP_SIGNATURE_VERIFICATION=true, returns true so
 * local fixtures and Vitest mocks still pass. In production this MUST verify.
 */

export type TwilioSignatureVerifyResult =
  | { ok: true }
  | { ok: false; reason: "missing_signature" | "missing_secret" | "invalid_signature" }

export function shouldSkipTwilioSignatureCheck(): boolean {
  if (process.env.NODE_ENV !== "production" && process.env.TWILIO_VERIFY_IN_DEV !== "true") return true
  return process.env.TWILIO_SKIP_SIGNATURE_VERIFICATION === "true"
}

export function verifyTwilioSignature(params: {
  signatureHeader: string | null | undefined
  fullUrl: string
  formParams: Record<string, string>
  authToken?: string | null
}): TwilioSignatureVerifyResult {
  if (shouldSkipTwilioSignatureCheck()) return { ok: true }

  const signature = (params.signatureHeader || "").trim()
  if (!signature) return { ok: false, reason: "missing_signature" }

  const authToken = (params.authToken ?? process.env.TWILIO_AUTH_TOKEN ?? "").trim()
  if (!authToken) return { ok: false, reason: "missing_secret" }

  const valid = twilio.validateRequest(authToken, signature, params.fullUrl, params.formParams)
  if (!valid) return { ok: false, reason: "invalid_signature" }
  return { ok: true }
}

function readForwardedValue(headers: Headers, key: string): string {
  return (headers.get(key) || "")
    .split(",")[0]
    .trim()
}

export function getTwilioRequestPublicUrl(req: Request): string {
  const originalUrl = new URL(req.url)
  const forwardedProto = readForwardedValue(req.headers, "x-forwarded-proto")
  const forwardedHost = readForwardedValue(req.headers, "x-forwarded-host")

  if (!forwardedProto && !forwardedHost) return originalUrl.toString()

  const publicUrl = new URL(originalUrl.toString())
  if (forwardedProto) {
    publicUrl.protocol = forwardedProto.endsWith(":") ? forwardedProto : `${forwardedProto}:`
  }
  if (forwardedHost) {
    publicUrl.host = forwardedHost
    if (!/:\d+$/.test(forwardedHost)) {
      publicUrl.port = ""
    }
  }
  return publicUrl.toString()
}

/**
 * Helper for Next.js App Router routes that receive Twilio's
 * `application/x-www-form-urlencoded` POST. Reads the body, builds a plain
 * params object, and runs verification.
 *
 * Usage:
 *   const verification = await verifyTwilioFormPost(req)
 *   if (!verification.ok) return new NextResponse("forbidden", { status: 403 })
 *   const params = verification.params
 */
export type TwilioFormPostResult =
  | { ok: true; params: Record<string, string> }
  | { ok: false; reason: "missing_signature" | "missing_secret" | "invalid_signature"; status: number }

export async function readTwilioFormParams(req: Request): Promise<Record<string, string>> {
  const formData = await req.formData()
  const params: Record<string, string> = {}
  for (const [key, value] of formData.entries()) {
    params[key] = typeof value === "string" ? value : value.name
  }
  return params
}

export async function verifyTwilioFormPost(req: Request): Promise<TwilioFormPostResult> {
  const params = await readTwilioFormParams(req)
  const signatureHeader = req.headers.get("x-twilio-signature")
  const fullUrl = getTwilioRequestPublicUrl(req)
  const result = verifyTwilioSignature({ signatureHeader, fullUrl, formParams: params })
  if (!result.ok) {
    return { ok: false, reason: result.reason, status: result.reason === "missing_signature" ? 401 : 403 }
  }
  return { ok: true, params }
}
