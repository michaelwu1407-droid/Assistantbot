import crypto from "node:crypto"

/**
 * HMAC-signed OAuth `state` parameter.
 *
 * The OAuth start handler builds a payload (workspaceId, userId, provider, intent),
 * encodes it, and appends an HMAC signed with OAUTH_STATE_SECRET. The callback
 * handler verifies the HMAC and the expiry before trusting any field of the payload.
 *
 * Without this, callbacks accept any state value the browser hands them, which means
 * an attacker can trigger a callback with a forged workspaceId and bind their own
 * OAuth tokens onto a victim's workspace.
 */

export type OAuthStatePayload = {
  workspaceId?: string
  userId?: string
  provider?: string
  intent?: string
  redirectTo?: string
}

const STATE_TTL_SECONDS = 15 * 60

function getSecret(): string {
  const secret = process.env.OAUTH_STATE_SECRET || process.env.NEXTAUTH_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) {
    throw new Error(
      "[oauth-state] OAUTH_STATE_SECRET (or NEXTAUTH_SECRET / SUPABASE_SERVICE_ROLE_KEY) must be set",
    )
  }
  return secret
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/")
  const padding = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4))
  return Buffer.from(padded + padding, "base64")
}

function hmac(input: string): string {
  return base64UrlEncode(crypto.createHmac("sha256", getSecret()).update(input).digest())
}

/**
 * Sign an OAuth state payload. Use the returned token as the `state` query param
 * when redirecting the user to the OAuth provider's authorize URL.
 */
export function signOAuthState(payload: OAuthStatePayload, options?: { ttlSeconds?: number }): string {
  const ttl = options?.ttlSeconds ?? STATE_TTL_SECONDS
  const body = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ttl,
    nonce: crypto.randomBytes(8).toString("hex"),
  }
  const encoded = base64UrlEncode(JSON.stringify(body))
  const signature = hmac(encoded)
  return `${encoded}.${signature}`
}

export type VerifyOAuthStateResult =
  | { ok: true; payload: OAuthStatePayload & { iat: number; exp: number; nonce: string } }
  | { ok: false; reason: "missing" | "malformed" | "bad_signature" | "expired" | "secret_missing" }

/**
 * Verify a state token returned from an OAuth provider. Returns the decoded
 * payload only if signature matches and the token has not expired.
 */
export function verifyOAuthState(rawToken: string | null | undefined): VerifyOAuthStateResult {
  if (!rawToken) return { ok: false, reason: "missing" }
  const parts = rawToken.split(".")
  if (parts.length !== 2) return { ok: false, reason: "malformed" }
  const [encoded, signature] = parts
  let expectedSignature: string
  try {
    expectedSignature = hmac(encoded)
  } catch {
    return { ok: false, reason: "secret_missing" }
  }
  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return { ok: false, reason: "bad_signature" }
  }
  let body: (OAuthStatePayload & { iat: number; exp: number; nonce: string }) | null = null
  try {
    body = JSON.parse(base64UrlDecode(encoded).toString("utf8"))
  } catch {
    return { ok: false, reason: "malformed" }
  }
  if (!body || typeof body.exp !== "number") return { ok: false, reason: "malformed" }
  if (body.exp < Math.floor(Date.now() / 1000)) return { ok: false, reason: "expired" }
  return { ok: true, payload: body }
}

/**
 * Convenience for callbacks that historically treated the state value as a literal
 * workspaceId. Returns the verified workspaceId or null if verification fails.
 */
export function verifyWorkspaceState(rawToken: string | null | undefined): string | null {
  const result = verifyOAuthState(rawToken)
  if (!result.ok) return null
  return typeof result.payload.workspaceId === "string" ? result.payload.workspaceId : null
}
