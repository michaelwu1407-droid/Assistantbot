import { createHmac } from "crypto"

const SECRET = process.env.EMAIL_UNSUBSCRIBE_SECRET || process.env.NEXTAUTH_SECRET || "fallback-dev-secret"

export function signUnsubscribeToken(contactId: string): string {
  const mac = createHmac("sha256", SECRET).update(contactId).digest("hex").slice(0, 32)
  return Buffer.from(`${contactId}:${mac}`).toString("base64url")
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8")
    const [contactId, mac] = decoded.split(":")
    if (!contactId || !mac) return null
    const expected = createHmac("sha256", SECRET).update(contactId).digest("hex").slice(0, 32)
    if (mac !== expected) return null
    return contactId
  } catch {
    return null
  }
}
