/**
 * Shared helpers for showing a human-friendly name in the UI (avoid phone digits as "name").
 */

export function looksLikePhoneValue(value?: string | null): boolean {
  if (!value) return false
  const digits = value.replace(/\D/g, "")
  return digits.length >= 8
}

/**
 * Pick a header display name: never show phone-like strings as the primary label.
 */
export function resolveHeaderDisplayName(options: {
  authName?: string | null
  dbName?: string | null
  email?: string | null
}): string {
  const { authName, dbName, email } = options

  const clean = (s: string | null | undefined) => (s?.trim() ? s.trim() : "")

  const a = clean(authName)
  const d = clean(dbName)
  const emailLocal = email?.includes("@") ? email.split("@")[0]?.trim() ?? "" : ""

  if (d && !looksLikePhoneValue(d)) return d
  if (a && !looksLikePhoneValue(a)) return a
  if (d && looksLikePhoneValue(d) && emailLocal && !looksLikePhoneValue(emailLocal)) return emailLocal
  if (emailLocal && !looksLikePhoneValue(emailLocal)) return emailLocal
  // Prefer a neutral label over generic "You" when we have no better string
  return emailLocal || "Account"
}
