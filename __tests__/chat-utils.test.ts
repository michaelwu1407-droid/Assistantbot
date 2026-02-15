import { describe, it, expect } from "vitest";
import {
  titleCase,
  categoriseWork,
  resolveSchedule,
  enrichAddress,
  WORK_CATEGORIES,
  STREET_ABBREVS,
} from "@/lib/chat-utils";

// ─── titleCase ──────────────────────────────────────────────────────

describe("titleCase", () => {
  it("capitalises each word", () => {
    expect(titleCase("sally jane")).toBe("Sally Jane");
  });

  it("handles single word", () => {
    expect(titleCase("john")).toBe("John");
  });

  it("handles already capitalised", () => {
    expect(titleCase("John Smith")).toBe("John Smith");
  });

  it("handles mixed case", () => {
    expect(titleCase("jOHN sMITH")).toBe("JOHN SMITH");
  });

  it("handles empty string", () => {
    expect(titleCase("")).toBe("");
  });
});

// ─── categoriseWork ─────────────────────────────────────────────────

describe("categoriseWork", () => {
  it("detects plumbing work", () => {
    expect(categoriseWork("broken sink")).toBe("Plumbing");
    expect(categoriseWork("leaking tap")).toBe("Plumbing");
    expect(categoriseWork("blocked drain")).toBe("Plumbing");
    expect(categoriseWork("toilet repair")).toBe("Plumbing");
  });

  it("detects electrical work", () => {
    expect(categoriseWork("broken fan")).toBe("Electrical");
    expect(categoriseWork("install light")).toBe("Electrical");
    expect(categoriseWork("tripped breaker")).toBe("Electrical");
    expect(categoriseWork("power outage")).toBe("Electrical");
  });

  it("detects HVAC work", () => {
    expect(categoriseWork("aircon not working")).toBe("HVAC");
    expect(categoriseWork("heating system broken")).toBe("HVAC");
    expect(categoriseWork("split system install")).toBe("HVAC");
  });

  it("detects carpentry work", () => {
    expect(categoriseWork("door won't close")).toBe("Carpentry");
    expect(categoriseWork("window frame repair")).toBe("Carpentry");
    expect(categoriseWork("build cabinet")).toBe("Carpentry");
  });

  it("detects roofing work", () => {
    expect(categoriseWork("roof repair")).toBe("Roofing");
    expect(categoriseWork("colorbond installation")).toBe("Roofing");
  });

  it("detects painting work", () => {
    expect(categoriseWork("paint bedroom")).toBe("Painting");
    expect(categoriseWork("peeling wall")).toBe("Painting");
  });

  it("detects tiling work", () => {
    expect(categoriseWork("tile bathroom")).toBe("Tiling");
    expect(categoriseWork("regrout tiles")).toBe("Tiling");
    expect(categoriseWork("splashback install")).toBe("Tiling");
  });

  it("returns General for unrecognised work", () => {
    expect(categoriseWork("general maintenance")).toBe("General");
    expect(categoriseWork("clean yard")).toBe("General");
  });

  it("is case insensitive", () => {
    expect(categoriseWork("BROKEN SINK")).toBe("Plumbing");
    expect(categoriseWork("Broken Fan")).toBe("Electrical");
  });
});

// ─── enrichAddress ──────────────────────────────────────────────────

describe("enrichAddress", () => {
  it("expands street abbreviations and capitalises", () => {
    expect(enrichAddress("45 wyndham st alexandria")).toBe("45 Wyndham Street, Alexandria");
  });

  it("expands avenue abbreviation", () => {
    expect(enrichAddress("10 george ave")).toBe("10 George Avenue");
  });

  it("expands road abbreviation", () => {
    expect(enrichAddress("7 main rd springfield")).toBe("7 Main Road, Springfield");
  });

  it("expands drive abbreviation", () => {
    expect(enrichAddress("22 sunset dr")).toBe("22 Sunset Drive");
  });

  it("expands crescent abbreviation", () => {
    expect(enrichAddress("3 bay cres")).toBe("3 Bay Crescent");
  });

  it("handles already capitalised addresses", () => {
    expect(enrichAddress("45 Wyndham Street")).toBe("45 Wyndham Street");
  });

  it("returns empty string as-is", () => {
    expect(enrichAddress("")).toBe("");
  });

  it("returns 'No address provided' as-is", () => {
    expect(enrichAddress("No address provided")).toBe("No address provided");
  });

  it("handles addresses with existing commas", () => {
    expect(enrichAddress("45 wyndham st, alexandria")).toBe("45 Wyndham Street, Alexandria");
  });
});

// ─── resolveSchedule ────────────────────────────────────────────────

describe("resolveSchedule", () => {
  it("resolves time with tomorrow shorthand", () => {
    const result = resolveSchedule("2pm tmrw");
    expect(result.display).toContain("2:");
    expect(result.display).toContain("PM");
    const date = new Date(result.iso);
    expect(date.getHours()).toBe(14);
    expect(date.getMinutes()).toBe(0);
    // Should be tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(date.getDate()).toBe(tomorrow.getDate());
  });

  it("resolves ymrw as tomorrow", () => {
    const result = resolveSchedule("12pm ymrw");
    const date = new Date(result.iso);
    expect(date.getHours()).toBe(12);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(date.getDate()).toBe(tomorrow.getDate());
  });

  it("resolves today", () => {
    const result = resolveSchedule("3pm today");
    const date = new Date(result.iso);
    expect(date.getHours()).toBe(15);
    expect(date.getDate()).toBe(new Date().getDate());
  });

  it("resolves time with AM", () => {
    const result = resolveSchedule("9am today");
    const date = new Date(result.iso);
    expect(date.getHours()).toBe(9);
  });

  it("resolves 12pm correctly (noon)", () => {
    const result = resolveSchedule("12pm");
    const date = new Date(result.iso);
    expect(date.getHours()).toBe(12);
  });

  it("resolves 12am correctly (midnight)", () => {
    const result = resolveSchedule("12am");
    const date = new Date(result.iso);
    expect(date.getHours()).toBe(0);
  });

  it("resolves day-only schedule (no time)", () => {
    const result = resolveSchedule("tomorrow");
    expect(result.display).not.toContain(":");
    const date = new Date(result.iso);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(date.getDate()).toBe(tomorrow.getDate());
  });

  it("resolves named weekday", () => {
    const result = resolveSchedule("9am mon");
    const date = new Date(result.iso);
    expect(date.getHours()).toBe(9);
    expect(date.getDay()).toBe(1); // Monday
  });

  it("returns valid ISO string", () => {
    const result = resolveSchedule("2pm tmrw");
    expect(() => new Date(result.iso)).not.toThrow();
    expect(new Date(result.iso).toISOString()).toBe(result.iso);
  });
});

// ─── Constants ──────────────────────────────────────────────────────

describe("WORK_CATEGORIES", () => {
  it("has all expected categories", () => {
    const categories = Object.keys(WORK_CATEGORIES);
    expect(categories).toContain("Plumbing");
    expect(categories).toContain("Electrical");
    expect(categories).toContain("HVAC");
    expect(categories).toContain("Carpentry");
    expect(categories).toContain("Roofing");
    expect(categories).toContain("Painting");
    expect(categories).toContain("Tiling");
    expect(categories).toContain("General");
  });

  it("General has no keywords (catch-all)", () => {
    expect(WORK_CATEGORIES["General"]).toEqual([]);
  });
});

describe("STREET_ABBREVS", () => {
  it("maps common abbreviations", () => {
    expect(STREET_ABBREVS["st"]).toBe("Street");
    expect(STREET_ABBREVS["ave"]).toBe("Avenue");
    expect(STREET_ABBREVS["rd"]).toBe("Road");
    expect(STREET_ABBREVS["blvd"]).toBe("Boulevard");
    expect(STREET_ABBREVS["dr"]).toBe("Drive");
    expect(STREET_ABBREVS["ln"]).toBe("Lane");
    expect(STREET_ABBREVS["ct"]).toBe("Court");
    expect(STREET_ABBREVS["pl"]).toBe("Place");
  });
});
