import { getKnownEarlymarkInboundNumbers } from "@/lib/earlymark-inbound-config"

export type EnvironmentValidation = {
  valid: boolean
  missing: string[]
  warnings: string[]
  malformed: string[]
  strict: boolean
}

type FormatCheck = { key: string; check: (value: string) => boolean; reason: string }

const ALWAYS_REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
]

const PRODUCTION_REQUIRED = [
  "NEXT_PUBLIC_APP_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
]

const FORMAT_CHECKS: FormatCheck[] = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", check: isHttpsUrl, reason: "must be an https:// URL" },
  { key: "NEXT_PUBLIC_APP_URL", check: isHttpsUrl, reason: "must be an https:// URL in production" },
  { key: "DATABASE_URL", check: (v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), reason: "must start with postgres:// or postgresql://" },
  { key: "DIRECT_URL", check: (v) => v.startsWith("postgres://") || v.startsWith("postgresql://"), reason: "must start with postgres:// or postgresql://" },
  { key: "STRIPE_SECRET_KEY", check: (v) => v.startsWith("sk_"), reason: "must start with sk_ (test or live key)" },
  { key: "STRIPE_WEBHOOK_SECRET", check: (v) => v.startsWith("whsec_"), reason: "must start with whsec_" },
  { key: "RESEND_API_KEY", check: (v) => v.startsWith("re_"), reason: "must start with re_" },
]

const PLACEHOLDER_HINTS = ["placeholder", "REPLACE_ME", "your-key-here", "xxxx"]

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}

function looksLikePlaceholder(value: string): boolean {
  const lower = value.toLowerCase()
  return PLACEHOLDER_HINTS.some((hint) => lower.includes(hint.toLowerCase()))
}

export function validateEnvironment(): EnvironmentValidation {
  const isProduction = process.env.NODE_ENV === "production"
  const strict = isProduction && process.env.STRICT_ENV_VALIDATION === "true"
  const requiredKeys = isProduction ? [...ALWAYS_REQUIRED, ...PRODUCTION_REQUIRED] : ALWAYS_REQUIRED

  const missing = requiredKeys.filter((key) => !process.env[key])
  const warnings: string[] = []
  const malformed: string[] = []

  for (const key of requiredKeys) {
    const value = process.env[key]
    if (!value) continue
    if (looksLikePlaceholder(value)) {
      warnings.push(`${key} looks like a placeholder value`)
    }
  }

  for (const { key, check, reason } of FORMAT_CHECKS) {
    const value = process.env[key]
    if (!value) continue
    if (!check(value)) {
      malformed.push(`${key} ${reason}`)
    }
  }

  if (!isProduction) {
    if (!process.env.STRIPE_SECRET_KEY) warnings.push("STRIPE_SECRET_KEY missing; billing checkout cannot be verified")
    if (!process.env.STRIPE_WEBHOOK_SECRET) warnings.push("STRIPE_WEBHOOK_SECRET missing; Stripe webhooks unverified")
    if (!process.env.RESEND_API_KEY) warnings.push("RESEND_API_KEY missing; outbound email cannot be verified")
    if (!process.env.RESEND_WEBHOOK_SECRET) warnings.push("RESEND_WEBHOOK_SECRET missing; inbound email webhooks unverified")
  }

  if (getKnownEarlymarkInboundNumbers().length === 0) {
    warnings.push(
      "No Earlymark inbound phone number configured (EARLYMARK_INBOUND_PHONE_NUMBERS / EARLYMARK_INBOUND_PHONE_NUMBER / EARLYMARK_PHONE_NUMBER / TWILIO_PHONE_NUMBER)",
    )
  }

  return {
    valid: missing.length === 0 && malformed.length === 0,
    missing,
    warnings,
    malformed,
    strict,
  }
}

export class StartupEnvironmentError extends Error {
  readonly missing: string[]
  readonly malformed: string[]
  constructor(missing: string[], malformed: string[]) {
    super(
      `Startup aborted: ${missing.length} required env var(s) missing, ${malformed.length} malformed. ` +
        `Missing=[${missing.join(", ")}] Malformed=[${malformed.join(" | ")}]`,
    )
    this.name = "StartupEnvironmentError"
    this.missing = missing
    this.malformed = malformed
  }
}

export function runStartupEnvironmentValidation() {
  console.log("[startup] Performing startup environment validation...")
  const environment = validateEnvironment()

  if (environment.missing.length > 0) {
    console.error(`[startup] MISSING required env vars: ${environment.missing.join(", ")}`)
  }
  if (environment.malformed.length > 0) {
    console.error(`[startup] MALFORMED env vars: ${environment.malformed.join(" | ")}`)
  }
  for (const warning of environment.warnings) {
    console.warn(`[startup] WARN ${warning}`)
  }

  if (environment.strict && (environment.missing.length > 0 || environment.malformed.length > 0)) {
    throw new StartupEnvironmentError(environment.missing, environment.malformed)
  }

  if (environment.valid) {
    console.log("[startup] Startup environment validation passed")
  } else {
    console.warn("[startup] Environment validation issues (set STRICT_ENV_VALIDATION=true to abort startup)")
  }

  return environment
}
