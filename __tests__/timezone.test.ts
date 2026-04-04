import { describe, expect, it } from "vitest";

import {
  formatDateTimeInTimezone,
  formatTimeInTimezone,
  parseDateTimeLocalInTimezone,
  toDateKeyInTimezone,
  toDateTimeLocalValue,
} from "@/lib/timezone";

describe("timezone helpers", () => {
  it("round-trips Sydney local datetime values through UTC storage", () => {
    const parsed = parseDateTimeLocalInTimezone("2026-04-15T09:30", "Australia/Sydney");

    expect(parsed?.toISOString()).toBe("2026-04-14T23:30:00.000Z");
    expect(toDateTimeLocalValue(parsed, "Australia/Sydney")).toBe("2026-04-15T09:30");
  });

  it("handles Sydney daylight savings correctly", () => {
    const parsed = parseDateTimeLocalInTimezone("2026-01-15T09:30", "Australia/Sydney");

    expect(parsed?.toISOString()).toBe("2026-01-14T22:30:00.000Z");
    expect(formatTimeInTimezone(parsed!, "Australia/Sydney")).toBe("9:30 AM");
    expect(toDateKeyInTimezone(parsed!, "Australia/Sydney")).toBe("2026-01-15");
  });

  it("formats consistent customer-facing schedule strings", () => {
    const date = new Date("2026-04-14T23:30:00.000Z");

    expect(formatDateTimeInTimezone(date, "Australia/Sydney")).toBe("Apr 15, 2026 9:30 AM");
  });
});
