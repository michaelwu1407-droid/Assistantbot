import { describe, expect, it } from "vitest";

import {
  VOICE_STT_BASE_KEYTERMS,
  resolveSttKeyterms,
  deriveGroundingKeyterms,
  buildCallKeyterms,
} from "@/livekit-agent/stt-keyterms";

describe("resolveSttKeyterms", () => {
  it("returns the base list when no env override is set", () => {
    const result = resolveSttKeyterms({} as NodeJS.ProcessEnv);
    expect(result).toEqual(VOICE_STT_BASE_KEYTERMS);
  });

  it("merges env keyterms and de-duplicates", () => {
    const result = resolveSttKeyterms({
      VOICE_STT_KEYTERMS: "Tracey, Bluey, Heeler",
    } as NodeJS.ProcessEnv);
    expect(result).toContain("Bluey");
    expect(result).toContain("Heeler");
    // "Tracey" already in base — appears once.
    expect(result.filter((t) => t === "Tracey")).toHaveLength(1);
  });

  it("ignores blank env entries", () => {
    const result = resolveSttKeyterms({
      VOICE_STT_KEYTERMS: " , ,Spotless,",
    } as NodeJS.ProcessEnv);
    expect(result).toContain("Spotless");
    expect(result).not.toContain("");
  });
});

describe("deriveGroundingKeyterms", () => {
  it("returns nothing when grounding is null", () => {
    expect(deriveGroundingKeyterms(null)).toEqual([]);
  });

  it("includes the business name and trade type", () => {
    const result = deriveGroundingKeyterms({
      businessName: "Bayside Blocked Drains",
      tradeType: "Plumber",
      serviceArea: null,
      physicalAddress: null,
    });
    expect(result).toContain("Bayside Blocked Drains");
    expect(result).toContain("Plumber");
  });

  it("splits service-area suburb lists on common separators", () => {
    const result = deriveGroundingKeyterms({
      businessName: "Acme",
      tradeType: null,
      serviceArea: "Bondi, Coogee / Maroubra; Randwick",
      physicalAddress: null,
    });
    expect(result).toEqual(expect.arrayContaining(["Bondi", "Coogee", "Maroubra", "Randwick"]));
  });

  it("drops pure-number fragments (street numbers, postcodes)", () => {
    const result = deriveGroundingKeyterms({
      businessName: null,
      tradeType: null,
      serviceArea: null,
      physicalAddress: "12, Marrickville, 2204",
    });
    expect(result).toContain("Marrickville");
    expect(result).not.toContain("12");
    expect(result).not.toContain("2204");
  });
});

describe("buildCallKeyterms", () => {
  it("combines base, env, and grounding terms with de-duplication", () => {
    const result = buildCallKeyterms(
      { businessName: "Newtown", tradeType: "Sparky", serviceArea: "Newtown", physicalAddress: null },
      { VOICE_STT_KEYTERMS: "Sparky" } as NodeJS.ProcessEnv,
    );
    // "Newtown" is in the base list AND grounding — must appear once.
    expect(result.filter((t) => t === "Newtown")).toHaveLength(1);
    // "Sparky" from both env and grounding — once.
    expect(result.filter((t) => t === "Sparky")).toHaveLength(1);
    // Base terms still present.
    expect(result).toContain("Tracey");
  });

  it("equals the base list when grounding is null and no env override", () => {
    const result = buildCallKeyterms(null, {} as NodeJS.ProcessEnv);
    expect(result).toEqual(VOICE_STT_BASE_KEYTERMS);
  });
});
