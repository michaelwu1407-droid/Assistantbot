export function normalizePhone(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return `+61${cleaned.slice(1)}`;
  if (cleaned.startsWith("61")) return `+${cleaned}`;
  return cleaned;
}

export function phoneMatches(left?: string | null, right?: string | null): boolean {
  const a = normalizePhone(left);
  const b = normalizePhone(right);
  if (!a || !b) return false;
  return a === b || a.replace(/^\+/, "") === b.replace(/^\+/, "");
}

export function phoneVariants(phone?: string | null): string[] {
  const normalized = normalizePhone(phone);
  if (!normalized) return [];
  const digits = normalized.replace(/[^\d]/g, "");
  const variants = new Set<string>([
    normalized,
    digits,
    digits.startsWith("61") ? `0${digits.slice(2)}` : digits,
    digits.startsWith("61") ? digits.slice(2) : digits,
  ]);
  return Array.from(variants).filter(Boolean);
}

export function normalizeEmail(email?: string | null): string {
  return (email || "").trim().toLowerCase();
}
