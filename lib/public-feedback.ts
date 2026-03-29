import { createHmac, timingSafeEqual } from "node:crypto"

type PublicFeedbackTokenPayload = {
  dealId: string
  contactId: string
  workspaceId: string
  exp: number
}

const PUBLIC_FEEDBACK_TOKEN_VERSION = "v1"

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

function getFeedbackSecret() {
  return (
    process.env.CRON_SECRET ||
    process.env.ENCRYPTION_KEY ||
    process.env.TELEMETRY_ADMIN_KEY ||
    "development-feedback-secret"
  )
}

function signPublicFeedbackPayload(payload: string) {
  return createHmac("sha256", getFeedbackSecret()).update(payload).digest()
}

export function createPublicFeedbackToken(input: {
  dealId: string
  contactId: string
  workspaceId: string
  expiresInDays?: number
}) {
  const payload: PublicFeedbackTokenPayload = {
    dealId: input.dealId,
    contactId: input.contactId,
    workspaceId: input.workspaceId,
    exp: Date.now() + (input.expiresInDays ?? 90) * 24 * 60 * 60 * 1000,
  }

  const payloadSegment = toBase64Url(
    JSON.stringify({
      v: PUBLIC_FEEDBACK_TOKEN_VERSION,
      ...payload,
    }),
  )
  const signatureSegment = toBase64Url(signPublicFeedbackPayload(payloadSegment))
  return `${payloadSegment}.${signatureSegment}`
}

export function verifyPublicFeedbackToken(token: string): PublicFeedbackTokenPayload | null {
  const [payloadSegment, signatureSegment] = token.split(".")
  if (!payloadSegment || !signatureSegment) return null

  const expectedSignature = signPublicFeedbackPayload(payloadSegment)
  const actualSignature = fromBase64Url(signatureSegment)
  if (expectedSignature.length !== actualSignature.length) return null
  if (!timingSafeEqual(expectedSignature, actualSignature)) return null

  try {
    const parsed = JSON.parse(fromBase64Url(payloadSegment).toString("utf8")) as
      | (PublicFeedbackTokenPayload & { v?: string })
      | null
    if (!parsed || parsed.v !== PUBLIC_FEEDBACK_TOKEN_VERSION) return null
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

export function buildPublicFeedbackUrl(input: {
  dealId: string
  contactId: string
  workspaceId: string
  expiresInDays?: number
}) {
  const token = createPublicFeedbackToken(input)
  return `${getPublicAppUrl()}/feedback/${token}`
}
