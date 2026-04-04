import {
  buildCrmChatSystemPrompt,
  buildCustomerEmailSystemPrompt,
  buildCustomerSmsSystemPrompt,
} from "@/lib/ai/prompt-contract";

describe("Tracey prompt contract", () => {
  it("builds a CRM prompt with shared tool-first and customer-contact policy rules", () => {
    const prompt = buildCrmChatSystemPrompt({
      userRole: "OWNER",
      customerContactPolicyBlock: "TRACEY FOR USERS CUSTOMER-CONTACT MODE: Review & approve.",
      workspaceContextBlocks: ["BUSINESS KNOWLEDGE:\n- Emergency service available"],
      pricingIntegrityBlock: "- Never guess prices.",
      messagingRuleBlock: "Send exact words.",
      uncertaintyBlock: "Explain what failed.",
      roleGuardBlock: "TEAM_MEMBER users cannot change restricted data.",
      multiJobBlock: "Use showJobDraftForConfirmation.",
      jobDraftBlock: "Do not repeat the draft card.",
    });

    expect(prompt).toContain("ROLE");
    expect(prompt).toContain("TOOL-FIRST DATA RULES");
    expect(prompt).toContain("CUSTOMER-CONTACT POLICY");
    expect(prompt).toContain('Say "jobs" not "meetings".');
    expect(prompt).toContain("Reply in the same language as the customer or user.");
    expect(prompt).toContain("Treat the WORKSPACE CONTEXT current date/time as authoritative");
    expect(prompt).toContain("If a tool returns success=false or an error payload");
    expect(prompt).toContain("After tool use, briefly confirm the outcome using the tool response");
  });

  it("adds the AI intro to the first SMS reply only", () => {
    const firstReplyPrompt = buildCustomerSmsSystemPrompt({
      businessName: "Acme Plumbing",
      firstReplyShouldIntroduceAi: true,
      sentenceGuidance: "Keep replies to 1-2 sentences.",
      modeRaw: "REVIEW_APPROVE",
      businessContextBlocks: ["SERVICES:\n- Blocked drains"],
    });
    const laterReplyPrompt = buildCustomerSmsSystemPrompt({
      businessName: "Acme Plumbing",
      firstReplyShouldIntroduceAi: false,
      sentenceGuidance: "Keep replies to 1-2 sentences.",
      modeRaw: "REVIEW_APPROVE",
      businessContextBlocks: ["SERVICES:\n- Blocked drains"],
    });

    expect(firstReplyPrompt).toContain('In your first reply in a new sms thread, briefly introduce yourself as "Tracey, the AI assistant for Acme Plumbing."');
    expect(laterReplyPrompt).toContain("Do not repeat your AI introduction in this sms thread unless the customer asks");
    expect(firstReplyPrompt).toContain("This is SMS, not email.");
  });

  it("builds a customer email prompt with triage, language lock, and first-thread AI disclosure", () => {
    const prompt = buildCustomerEmailSystemPrompt({
      businessName: "Acme Plumbing",
      industry: "trades",
      hours: "08:00 to 17:00",
      callOutFee: 149,
      firstReplyShouldIntroduceAi: true,
      modeRaw: "EXECUTE",
      preferences: "Keep it polite.",
      recentHistory: "[EMAIL] Previous thread: customer asked about a leak",
      senderName: "Pat Customer",
      senderEmail: "pat@example.com",
      subject: "Need help with a leaking pipe",
      body: "My kitchen pipe is leaking. Can you come tomorrow?",
    });

    expect(prompt).toContain("LEAD TRIAGE");
    expect(prompt).toContain("RESPONSE FORMAT");
    expect(prompt).toContain("GENUINE LEAD");
    expect(prompt).toContain("Reply in the same language as the customer or user.");
    expect(prompt).toContain('In your first reply in a new email thread, briefly introduce yourself as "Tracey, the AI assistant for Acme Plumbing."');
    expect(prompt).toContain("Only mention the standard call-out fee of $149 when it is useful");
  });
});
