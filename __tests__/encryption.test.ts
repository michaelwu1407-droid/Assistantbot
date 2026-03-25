import { describe, expect, it, vi } from "vitest";

describe("encryption", () => {
  it("round-trips encrypt/decrypt with a deterministic 32-byte ENCRYPTION_KEY", async () => {
    vi.resetModules();
    process.env.ENCRYPTION_KEY = "12345678901234567890123456789012"; // 32 chars -> 32 bytes UTF-8
    const mod = await import("@/lib/encryption");

    const plaintext = "secret-token-payload";
    const ciphertext = mod.encrypt(plaintext);
    expect(typeof ciphertext).toBe("string");
    expect(mod.decrypt(ciphertext)).toBe(plaintext);
  });

  it("fails when encryption is used without ENCRYPTION_KEY", async () => {
    vi.resetModules();
    delete process.env.ENCRYPTION_KEY;

    const mod = await import("@/lib/encryption");
    expect(() => mod.encrypt("secret-token-payload")).toThrow(/Missing ENCRYPTION_KEY/);
  });
});

