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

  it("steers aggregate invoice queries toward the exact invoice-ready tool", () => {
    const result = preClassify("What jobs for ZZZ AUTO test are ready to invoice or already invoiced?");

    expect(result.intent).toBe("invoice");
    expect(result.suggestedTools[0]).toBe("listInvoiceReadyJobs");
    expect(result.contextHints.join(" ")).toContain("listInvoiceReadyJobs first");
  });

  it("steers blocked or incomplete job queries toward the exact attention tool", () => {
    const result = preClassify("What jobs for ZZZ AUTO test look incomplete or blocked?");

    expect(result.intent).toBe("reporting");
    expect(result.suggestedTools[0]).toBe("listIncompleteOrBlockedJobs");
    expect(result.contextHints.join(" ")).toContain("listIncompleteOrBlockedJobs first");
  });

  it("steers fully specified job creation toward createJobNatural without forcing a draft", () => {
    const result = preClassify("Create a new job called Blocked Drain for Alex Harper at 12 Test Street Sydney with a quoted value of $420.");

    expect(result.intent).toBe("crm_action");
    expect(result.suggestedTools[0]).toBe("createJobNatural");
    expect(result.contextHints.join(" ")).toContain("Use createJobNatural");
    expect(result.contextHints.join(" ")).toContain("Do not ask for phone or email");
  });
});
