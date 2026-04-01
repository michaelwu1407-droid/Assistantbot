import { describe, it, expect } from "vitest";
import { looksLikePhoneValue, resolveHeaderDisplayName } from "@/lib/display-name";

describe("looksLikePhoneValue", () => {
  it("returns true for an Australian mobile number", () => {
    expect(looksLikePhoneValue("0480123456")).toBe(true);
  });

  it("returns true for a number with formatting", () => {
    expect(looksLikePhoneValue("+61 480 123 456")).toBe(true);
  });

  it("returns true for exactly 8 digits (minimum threshold)", () => {
    expect(looksLikePhoneValue("12345678")).toBe(true);
  });

  it("returns false for a short number (7 digits)", () => {
    expect(looksLikePhoneValue("1234567")).toBe(false);
  });

  it("returns false for a regular name", () => {
    expect(looksLikePhoneValue("John Smith")).toBe(false);
  });

  it("returns false for an email-like string", () => {
    expect(looksLikePhoneValue("john@example.com")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(looksLikePhoneValue("")).toBe(false);
  });

  it("returns false for null", () => {
    expect(looksLikePhoneValue(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(looksLikePhoneValue(undefined)).toBe(false);
  });
});

describe("resolveHeaderDisplayName", () => {
  it("prefers dbName over authName when dbName is not phone-like", () => {
    const result = resolveHeaderDisplayName({
      authName: "Auth User",
      dbName: "DB Name",
      email: "user@example.com",
    });
    expect(result).toBe("DB Name");
  });

  it("falls back to authName when dbName is phone-like", () => {
    const result = resolveHeaderDisplayName({
      authName: "Auth User",
      dbName: "0480123456",
      email: "user@example.com",
    });
    expect(result).toBe("Auth User");
  });

  it("falls back to email local part when both name fields are phone-like", () => {
    const result = resolveHeaderDisplayName({
      authName: "61480123456",
      dbName: "0480123456",
      email: "john@example.com",
    });
    expect(result).toBe("john");
  });

  it("falls back to email local part when both names are absent", () => {
    const result = resolveHeaderDisplayName({
      authName: null,
      dbName: null,
      email: "john@example.com",
    });
    expect(result).toBe("john");
  });

  it("returns Account when everything is empty", () => {
    const result = resolveHeaderDisplayName({
      authName: null,
      dbName: null,
      email: null,
    });
    expect(result).toBe("Account");
  });

  it("returns Account when email has no local part", () => {
    const result = resolveHeaderDisplayName({
      authName: null,
      dbName: null,
      email: "",
    });
    expect(result).toBe("Account");
  });

  it("trims whitespace from names before evaluating", () => {
    const result = resolveHeaderDisplayName({
      authName: "  ",
      dbName: "  ",
      email: "john@example.com",
    });
    expect(result).toBe("john");
  });

  it("prefers dbName email local part over just returning Account when dbName is phone-like", () => {
    const result = resolveHeaderDisplayName({
      authName: null,
      dbName: "0480123456",
      email: "tradie@example.com",
    });
    expect(result).toBe("tradie");
  });
});
