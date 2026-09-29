import { createHmac, timingSafeEqual } from "node:crypto"

type PublicJobPortalTokenPayload = {
  dealId: string
  contactId: string
  workspaceId: string
  exp: number
}

const PUBLIC_JOB_PORTAL_TOKEN_VERSION = "v1"

function toBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padLength = (4 - (normalized.length % 4)) % 4
  return Buffer.from(`${normalized}${"=".repeat(padLength)}`, "base64")
}

/**
 * HMAC key for customer portal links.
 *
 * Returns null when nothing is configured in production. There used to be a
 * shared literal fallback here, which meant that on a deployment missing all
 * three env vars every portal token was forgeable for any dealId — and
 * accepting a quote or confirming payment are unauthenticated actions
 * (`actions/job-portal-actions.ts`). Failing closed is the only safe default.
 *
 * The dev fallback stays so local work and tests run without setup.
 */
function getPortalSecret(): string | null {
  const configured =
    process.env.CRON_SECRET ||
    process.env.ENCRYPTION_KEY ||
    process.env.TELEMETRY_ADMIN_KEY

  if (configured) return configured
  if (process.env.NODE_ENV === "production") return null
  return "development-portal-secret"
}

function signPublicJobPortalPayload(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest()
}

export function createPublicJobPortalToken(input: {
  dealId: string
  contactId: string
  workspaceId: string
  expiresInDays?: number
}): string | null {
  const secret = getPortalSecret()
  if (!secret) {
    console.error(
      "[public-job-portal] Refusing to mint a portal link: no signing secret configured. Set CRON_SECRET (or ENCRYPTION_KEY / TELEMETRY_ADMIN_KEY).",
    )
    return null
  }

  const payload: PublicJobPortalTokenPayload = {
    dealId: input.dealId,
    contactId: input.contactId,
    workspaceId: input.workspaceId,
    exp: Date.now() + (input.expiresInDays ?? 14) * 24 * 60 * 60 * 1000,
  }

  const payloadSegment = toBase64Url(
    JSON.stringify({
      v: PUBLIC_JOB_PORTAL_TOKEN_VERSION,
      ...payload,
    }),
  )
  const signatureSegment = toBase64Url(signPublicJobPortalPayload(payloadSegment, secret))
  return `${payloadSegment}.${signatureSegment}`
}

export function verifyPublicJobPortalToken(token: string): PublicJobPortalTokenPayload | null {
  const secret = getPortalSecret()
  if (!secret) return null

  const [payloadSegment, signatureSegment] = token.split(".")
  if (!payloadSegment || !signatureSegment) return null

  const expectedSignature = signPublicJobPortalPayload(payloadSegment, secret)
  const actualSignature = fromBase64Url(signatureSegment)
  if (expectedSignature.length !== actualSignature.length) return null
  if (!timingSafeEqual(expectedSignature, actualSignature)) return null

  try {
    const parsed = JSON.parse(fromBase64Url(payloadSegment).toString("utf8")) as
      | (PublicJobPortalTokenPayload & { v?: string })
      | null
    if (!parsed || parsed.v !== PUBLIC_JOB_PORTAL_TOKEN_VERSION) return null
    if (!parsed.dealId || !parsed.contactId || !parsed.workspaceId || !parsed.exp) return null
    if (parsed.exp < Date.now()) return null
    return {
      dealId: parsed.dealId,
      contactId: parsed.contactId,
      workspaceId: parsed.workspaceId,
      exp: parsed.exp,
    }
  } catch {
    return null
  }
}

export function getPublicAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "")
}

export function buildPublicJobPortalUrl(input: {
  dealId: string
  contactId: string
  workspaceId: string
  expiresInDays?: number
}): string | null {
  const token = createPublicJobPortalToken(input)
  if (!token) return null
  return `${getPublicAppUrl()}/portal/${token}`
}
