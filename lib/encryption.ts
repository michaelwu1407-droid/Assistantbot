import crypto from "crypto";

function deriveEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("Missing ENCRYPTION_KEY env var (required for token encryption/decryption).");
  }

  // Compatibility-first:
  // - If ENCRYPTION_KEY is already a 32-byte ASCII/UTF-8 string, use it as-is.
  // - If it looks like hex (64 chars), decode as hex.
  // - If it looks like base64, decode as base64.
  // - Otherwise, hash deterministically to 32 bytes.
  const utf8Buf = Buffer.from(raw, "utf8");
  if (utf8Buf.length === 32) return utf8Buf;

  const isHex = /^[0-9a-fA-F]{64}$/.test(raw.trim());
  if (isHex) {
    const hexBuf = Buffer.from(raw.trim(), "hex");
    if (hexBuf.length !== 32) throw new Error("ENCRYPTION_KEY hex decoded to invalid length.");
    return hexBuf;
  }

  const isBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(raw.trim());
  if (isBase64) {
    const b64Buf = Buffer.from(raw.trim(), "base64");
    if (b64Buf.length === 32) return b64Buf;
  }

  return crypto.createHash("sha256").update(raw, "utf8").digest();
}

const ENCRYPTION_KEY = deriveEncryptionKey();
const ALGORITHM = "aes-256-gcm";

/**
 * Encrypts sensitive data (OAuth tokens) at rest
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}

/**
 * Decrypts sensitive data (OAuth tokens) at rest
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format");
  }
  
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}
