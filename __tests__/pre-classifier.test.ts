import { describe, expect, it } from "vitest";

import { preClassify } from "@/lib/ai/pre-classifier";

describe("pre-classifier", () => {
  it("routes product feedback language into the support escalation intent", () => {
    const result = preClassify("I have feedback about the chatbot and a feature suggestion.");

    expect(result.intent).toBe("support");
    expect(result.suggestedTools).toContain("contactSupport");
    expect(result.contextHints.join(" ")).toContain("product feedback");
  });

  it("recognizes CRM mutation requests and suggests direct action tools", () => {
    const result = preClassify("Move Hot Water Fix to scheduled and add a note for the customer access code.");

    expect(result.intent).toBe("crm_action");
    expect(result.suggestedTools).toContain("moveDeal");
    expect(result.suggestedTools).toContain("addDealNote");
  });
});
