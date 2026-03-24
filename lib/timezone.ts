const AU_STATE_TO_TIMEZONE: Array<{ token: RegExp; timezone: string }> = [
  { token: /\bwa\b|western australia/i, timezone: "Australia/Perth" },
  { token: /\bnt\b|northern territory/i, timezone: "Australia/Darwin" },
  { token: /\bsa\b|south australia/i, timezone: "Australia/Adelaide" },
  { token: /\bqld\b|queensland/i, timezone: "Australia/Brisbane" },
  { token: /\bnsw\b|new south wales/i, timezone: "Australia/Sydney" },
  { token: /\bvic\b|victoria/i, timezone: "Australia/Melbourne" },
  { token: /\bact\b|australian capital territory/i, timezone: "Australia/Sydney" },
  { token: /\btas\b|tasmania/i, timezone: "Australia/Hobart" },
]

export const DEFAULT_WORKSPACE_TIMEZONE = "Australia/Sydney"
export const AU_TIMEZONE_OPTIONS = [
  "Australia/Perth",
  "Australia/Darwin",
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Hobart",
] as const

export function isValidIanaTimezone(value: string | null | undefined): value is string {
  if (!value) return false
  try {
    Intl.DateTimeFormat("en-AU", { timeZone: value })
    return true
  } catch {
    return false
  }
}

export function inferTimezoneFromAddress(address: string | null | undefined): string {
  if (!address) return DEFAULT_WORKSPACE_TIMEZONE
  for (const rule of AU_STATE_TO_TIMEZONE) {
    if (rule.token.test(address)) return rule.timezone
  }
  return DEFAULT_WORKSPACE_TIMEZONE
}
