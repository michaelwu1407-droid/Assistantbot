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

function getPortalSecret() {
  return (
    process.env.CRON_SECRET ||
    process.env.ENCRYPTION_KEY ||
    process.env.TELEMETRY_ADMIN_KEY ||
    "development-portal-secret"
  )
}

function signPublicJobPortalPayload(payload: string) {
  return createHmac("sha256", getPortalSecret()).update(payload).digest()
}

export function createPublicJobPortalToken(input: {
  dealId: string
  contactId: string
  workspaceId: string
  expiresInDays?: number
}) {
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
  const signatureSegment = toBase64Url(signPublicJobPortalPayload(payloadSegment))
  return `${payloadSegment}.${signatureSegment}`
}

export function verifyPublicJobPortalToken(token: string): PublicJobPortalTokenPayload | null {
  const [payloadSegment, signatureSegment] = token.split(".")
  if (!payloadSegment || !signatureSegment) return null

  const expectedSignature = signPublicJobPortalPayload(payloadSegment)
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
}) {
  const token = createPublicJobPortalToken(input)
  return `${getPublicAppUrl()}/portal/${token}`
}
