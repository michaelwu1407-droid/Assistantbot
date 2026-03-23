import { getKnownEarlymarkInboundNumbers } from "@/lib/earlymark-inbound-config"

export type EnvironmentValidation = {
  valid: boolean
  missing: string[]
  warnings: string[]
}

export function validateEnvironment(): EnvironmentValidation {
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "DATABASE_URL",
    "DIRECT_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]

  const missing = required.filter((key) => !process.env[key])
  const warnings: string[] = []

  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("placeholder")) {
    warnings.push("NEXT_PUBLIC_SUPABASE_URL contains placeholder value")
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes("placeholder")) {
    warnings.push("NEXT_PUBLIC_SUPABASE_ANON_KEY contains placeholder value")
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    warnings.push("NEXT_PUBLIC_APP_URL is missing; Twilio voice/SMS callbacks and diagnostics may drift")
  }

  if (getKnownEarlymarkInboundNumbers().length === 0) {
    warnings.push(
      "No Earlymark inbound phone number is configured (EARLYMARK_INBOUND_PHONE_NUMBERS / EARLYMARK_INBOUND_PHONE_NUMBER / EARLYMARK_PHONE_NUMBER / TWILIO_PHONE_NUMBER)",
    )
  }

  return {
    valid: missing.length === 0 && warnings.length === 0,
    missing,
    warnings,
  }
}

export function runStartupEnvironmentValidation() {
  console.log("[startup] Performing startup environment validation...")

  const environment = validateEnvironment()
  if (!environment.valid) {
    console.warn("[startup] Environment validation issues:", environment)
  } else {
    console.log("[startup] Startup environment validation passed")
  }

  return environment
}
