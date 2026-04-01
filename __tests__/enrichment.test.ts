import { describe, it, expect } from "vitest";
import { extractDomain, enrichFromEmail } from "@/lib/enrichment";

describe("extractDomain", () => {
  it("extracts domain from a standard email", () => {
    expect(extractDomain("user@example.com")).toBe("example.com");
  });

  it("extracts subdomain", () => {
    expect(extractDomain("user@mail.example.com")).toBe("mail.example.com");
  });

  it("lowercases the domain", () => {
    expect(extractDomain("user@GOOGLE.COM")).toBe("google.com");
  });

  it("returns null for a string without @", () => {
    expect(extractDomain("notanemail")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractDomain("")).toBeNull();
  });

  it("returns null for a bare domain (no @)", () => {
    expect(extractDomain("example.com")).toBeNull();
  });
});

describe("enrichFromEmail", () => {
  it("returns null for personal email providers", async () => {
    const personalEmails = [
      "john@gmail.com",
      "jane@yahoo.com",
      "bob@hotmail.com",
      "alice@outlook.com",
      "carol@icloud.com",
      "dave@protonmail.com",
    ];
    for (const email of personalEmails) {
      expect(await enrichFromEmail(email)).toBeNull();
    }
  });

  it("returns null for an email with no valid domain", async () => {
    expect(await enrichFromEmail("notanemail")).toBeNull();
  });

  it("returns known company enrichment for google.com", async () => {
    const result = await enrichFromEmail("user@google.com");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Google");
    expect(result!.industry).toBe("Technology");
    expect(result!.domain).toBe("google.com");
    expect(result!.logoUrl).toContain("google.com");
  });

  it("returns known company enrichment for stripe.com", async () => {
    const result = await enrichFromEmail("user@stripe.com");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Stripe");
    expect(result!.industry).toBe("Fintech");
  });

  it("returns derived enrichment for unknown business domain", async () => {
    const result = await enrichFromEmail("owner@sydneyroofing.com.au");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Sydneyroofing");
    expect(result!.industry).toBeNull();
    expect(result!.size).toBeNull();
    expect(result!.linkedinUrl).toBeNull();
    expect(result!.logoUrl).toContain("sydneyroofing.com.au");
  });

  it("includes a clearbit logo URL for known and unknown domains", async () => {
    const known = await enrichFromEmail("user@apple.com");
    expect(known!.logoUrl).toBe("https://logo.clearbit.com/apple.com");

    const unknown = await enrichFromEmail("user@acmetradie.com.au");
    expect(unknown!.logoUrl).toBe("https://logo.clearbit.com/acmetradie.com.au");
  });
});
