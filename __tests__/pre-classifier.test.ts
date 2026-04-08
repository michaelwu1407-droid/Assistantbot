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

  it("treats latest-note questions as contact lookups when phrased around a person", () => {
    const result = preClassify("Do you know the latest note on Alex Harper?");

    expect(result.intent).toBe("contact_lookup");
    expect(result.suggestedTools).toContain("getClientContext");
    expect(result.contextHints.join(" ")).toContain("latest-note questions about a contact");
  });

  it("steers completion blocker questions toward deal context instead of vague advice", () => {
    const result = preClassify("What still needs to happen before Hot Water Service can be completed?");

    expect(result.intent).toBe("crm_action");
    expect(result.suggestedTools[0]).toBe("getDealContext");
    expect(result.contextHints.join(" ")).toContain("explain what is still missing");
  });

  it("routes conversation history queries to contact_lookup with getConversationHistory suggested", () => {
    const result = preClassify("What conversation history do we have with Delta Cafe?");

    expect(result.intent).toBe("contact_lookup");
    expect(result.suggestedTools).toContain("getConversationHistory");
    expect(result.contextHints.join(" ")).toContain("getConversationHistory");
  });

  it("routes job history search queries to reporting with searchJobHistory as first tool", () => {
    const result = preClassify("Search past job history for Test Street.");

    expect(result.intent).toBe("reporting");
    expect(result.suggestedTools[0]).toBe("searchJobHistory");
    expect(result.contextHints.join(" ")).toContain("searchJobHistory");
  });

  it("includes unassignDeal in crm_action suggested tools for unassign requests", () => {
    const result = preClassify("Unassign Hot Water Service if it currently has an assignee.");

    expect(result.intent).toBe("crm_action");
    expect(result.suggestedTools).toContain("unassignDeal");
  });

  it("includes restoreDeal in crm_action suggested tools for restore requests", () => {
    const result = preClassify("Restore any deleted job if one exists.");

    expect(result.intent).toBe("crm_action");
    expect(result.suggestedTools).toContain("restoreDeal");
  });

  it("routes quote creation to invoice intent with QUOTE=DRAFT INVOICE hint", () => {
    const result = preClassify("Create a quote for Alex Harper for $350.");

    expect(result.intent).toBe("invoice");
    expect(result.suggestedTools).toContain("createDraftInvoice");
    expect(result.contextHints.join(" ")).toContain("QUOTE = DRAFT INVOICE");
    expect(result.contextHints.join(" ")).toContain("always try createDraftInvoice first");
    expect(result.contextHints.join(" ")).toContain("resolved deal title");
    expect(result.contextHints.join(" ")).toContain("updateInvoiceAmount");
  });

  it("puts getInvoiceStatus first for explicit invoice status questions", () => {
    const result = preClassify("What is the latest invoice status for Alex Harper?");

    expect(result.intent).toBe("invoice");
    expect(result.suggestedTools[0]).toBe("getInvoiceStatus");
  });

  it("hints at STAGE ADVANCE when user says advance or move forward", () => {
    const result = preClassify("Advance the Hot Water Fix job to the next stage.");

    expect(result.intent).toBe("crm_action");
    expect(result.contextHints.join(" ")).toContain("STAGE ADVANCE");
    expect(result.contextHints.join(" ")).toContain("getDealContext");
  });

  it("hints at QUOTE ACCEPTED when customer approved the quote", () => {
    const result = preClassify("The customer approved the quote for the bathroom reno — move it forward.");

    expect(result.intent).toBe("crm_action");
    expect(result.contextHints.join(" ")).toContain("QUOTE ACCEPTED");
    expect(result.contextHints.join(" ")).toContain("moveDeal");
  });

  it("includes SEND/ISSUE hint when issuing an invoice", () => {
    const result = preClassify("Send the invoice to John Smith for the plumbing job.");

    expect(result.intent).toBe("invoice");
    expect(result.contextHints.join(" ")).toContain("SEND/ISSUE");
    expect(result.suggestedTools).toContain("issueInvoice");
  });

  it("includes PAYMENT hint when marking invoice paid", () => {
    const result = preClassify("Mark the invoice paid for the Hot Water Service.");

    expect(result.intent).toBe("invoice");
    expect(result.contextHints.join(" ")).toContain("PAYMENT");
    expect(result.suggestedTools).toContain("markInvoicePaid");
    expect(result.suggestedTools).not.toContain("moveDeal");
    expect(result.contextHints.join(" ")).toContain("do not call moveDeal separately");
  });
});
