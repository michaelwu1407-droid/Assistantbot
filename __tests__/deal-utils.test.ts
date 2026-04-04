import { describe, expect, it } from "vitest";

import {
  PRISMA_STAGE_TO_UI_STAGE,
  STAGE_OPTIONS,
  getUserFacingDealStageLabel,
} from "@/lib/deal-utils";

describe("deal-utils stage labels", () => {
  it("maps legacy prisma stages to modern user-facing labels", () => {
    expect(getUserFacingDealStageLabel("CONTACTED")).toBe("Quote sent");
    expect(getUserFacingDealStageLabel("NEGOTIATION")).toBe("Scheduled");
    expect(getUserFacingDealStageLabel("PIPELINE")).toBe("Quote sent");
    expect(getUserFacingDealStageLabel("INVOICED")).toBe("Awaiting payment");
  });

  it("maps lower-case ui and raw stages to the same display copy", () => {
    expect(getUserFacingDealStageLabel("quote_sent")).toBe("Quote sent");
    expect(getUserFacingDealStageLabel("contacted")).toBe("Quote sent");
    expect(getUserFacingDealStageLabel("ready_to_invoice")).toBe("Awaiting payment");
    expect(getUserFacingDealStageLabel("pending_approval")).toBe("Pending approval");
  });

  it("keeps legacy pipeline out of deal edit options", () => {
    expect(STAGE_OPTIONS.map((option) => option.value)).not.toContain("pipeline");
    expect(PRISMA_STAGE_TO_UI_STAGE.PIPELINE).toBe("quote_sent");
  });
});
