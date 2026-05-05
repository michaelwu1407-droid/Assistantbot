/**
 * Recipient guardrail for outbound SMS, WhatsApp, and email.
 *
 * Throws SafeRecipientError when:
 *   - the target is empty or malformed
 *   - the target matches a static dev/test recipient (Twilio magic numbers, example.com, etc.)
 *   - BLOCK_OUTBOUND_MESSAGING=true (kill switch for staging tests)
 *   - OUTBOUND_RECIPIENT_ALLOWLIST is set and the target is not in it (allowlist mode)
 *
 * Each callsite is responsible for deciding whether to swallow the throw or let it propagate.
 * The default helpers in this module rethrow — wrong-recipient is treated as a fatal call,
 * not a recoverable warning.
 */

export type RecipientKind = "sms" | "whatsapp" | "email"

export class SafeRecipientError extends Error {
  readonly kind: RecipientKind
  readonly target: string
  readonly reason: string
  constructor(kind: RecipientKind, target: string, reason: string) {
    super(`[safe-recipient] refusing to send ${kind} to "${target}": ${reason}`)
    this.name = "SafeRecipientError"
    this.kind = kind
    this.target = target
    this.reason = reason
  }
}

const SMS_TEST_NUMBERS = new Set([
  "+15005550006", // Twilio magic test number (always succeeds)
  "+15005550001", // Twilio magic test number (invalid)
  "+15005550009", // Twilio magic test number (cannot route)
])

const EMAIL_TEST_DOMAINS = ["example.com", "example.org", "example.net", "test.local", "smoke.local", "localhost"]

const PHONE_REGEX = /^\+[1-9]\d{6,14}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseAllowlist(): { phones: Set<string>; emails: Set<string> } | null {
  const raw = (process.env.OUTBOUND_RECIPIENT_ALLOWLIST || "").trim()
  if (!raw) return null
  const phones = new Set<string>()
  const emails = new Set<string>()
  for (const entry of raw.split(",")) {
    const value = entry.trim().toLowerCase()
    if (!value) continue
    if (value.includes("@")) emails.add(value)
    else phones.add(value)
  }
  if (phones.size === 0 && emails.size === 0) return null
  return { phones, emails }
}

export function isOutboundMessagingBlocked(): boolean {
  return (process.env.BLOCK_OUTBOUND_MESSAGING || "").trim().toLowerCase() === "true"
}

export function assertSafeRecipient(kind: RecipientKind, rawTarget: string | null | undefined): string {
  const target = (rawTarget || "").trim()

  if (!target) {
    throw new SafeRecipientError(kind, "", "empty recipient")
  }

  if (isOutboundMessagingBlocked()) {
    throw new SafeRecipientError(kind, target, "BLOCK_OUTBOUND_MESSAGING is true")
  }

  if (kind === "sms" || kind === "whatsapp") {
    const stripped = target.replace(/^whatsapp:/, "")
    if (!PHONE_REGEX.test(stripped)) {
      throw new SafeRecipientError(kind, target, "phone number must be E.164 (e.g. +14155551234)")
    }
    if (SMS_TEST_NUMBERS.has(stripped)) {
      throw new SafeRecipientError(kind, target, "Twilio magic test number")
    }
  }

  if (kind === "email") {
    if (!EMAIL_REGEX.test(target)) {
      throw new SafeRecipientError(kind, target, "not a valid email address")
    }
    const domain = target.split("@")[1]?.toLowerCase() || ""
    if (EMAIL_TEST_DOMAINS.includes(domain)) {
      throw new SafeRecipientError(kind, target, `dev/test domain "${domain}"`)
    }
  }

  const allowlist = parseAllowlist()
  if (allowlist) {
    const lookup = target.toLowerCase().replace(/^whatsapp:/, "")
    const inList = kind === "email" ? allowlist.emails.has(lookup) : allowlist.phones.has(lookup)
    if (!inList) {
      throw new SafeRecipientError(
        kind,
        target,
        "OUTBOUND_RECIPIENT_ALLOWLIST is set and target is not on it (staging mode)",
      )
    }
  }

  return target
}

/** Returns null instead of throwing — for callsites that want soft enforcement. */
export function checkSafeRecipient(
  kind: RecipientKind,
  rawTarget: string | null | undefined,
): { ok: true; target: string } | { ok: false; reason: string } {
  try {
    return { ok: true, target: assertSafeRecipient(kind, rawTarget) }
  } catch (error) {
    if (error instanceof SafeRecipientError) return { ok: false, reason: error.reason }
    throw error
  }
}
