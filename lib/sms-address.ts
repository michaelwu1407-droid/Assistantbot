export function isReplyableSmsAddress(value: string | null | undefined): boolean {
  if (!value) return false;

  const normalized = value.trim();
  if (!normalized) return false;

  if (normalized.startsWith("whatsapp:")) {
    return false;
  }

  return /^\+?[0-9]{7,15}$/.test(normalized);
}
