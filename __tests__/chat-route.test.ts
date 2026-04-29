import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  streamText: vi.fn(),
  convertToModelMessages: vi.fn(),
  stepCountIs: vi.fn(),
  createUIMessageStream: vi.fn(),
  createUIMessageStreamResponse: vi.fn(),
  createGoogleGenerativeAI: vi.fn(),
  saveUserMessage: vi.fn(),
  runAddContactNote: vi.fn(),
  runAddDealNote: vi.fn(),
  runAssignTeamMember: vi.fn(),
  runCreateContact: vi.fn(),
  runCreateDraftInvoice: vi.fn(),
  runCreateJobNatural: vi.fn(),
  runCreateTask: vi.fn(),
  runGetAttentionRequired: vi.fn(),
  runGetConversationHistory: vi.fn(),
  runGetDealContext: vi.fn(),
  runGetInvoiceStatusAction: vi.fn(),
  runListRecentCrmChanges: vi.fn(),
  runMoveDeal: vi.fn(),
  runRestoreDeal: vi.fn(),
  runSearchContacts: vi.fn(),
  runUndoLastAction: vi.fn(),
  runUnassignDeal: vi.fn(),
  runUpdateContactFields: vi.fn(),
  runUpdateDealFields: vi.fn(),
  runUpdateInvoiceAmount: vi.fn(),
  getDeals: vi.fn(),
  getWorkspaceSettingsById: vi.fn(),
  runGetAvailability: vi.fn(),
  runGetClientContext: vi.fn(),
  runGetTodaySummary: vi.fn(),
  buildJobDraftFromParams: vi.fn(),
  parseJobWithAI: vi.fn(),
  parseMultipleJobsWithAI: vi.fn(),
  extractAllJobsFromParagraph: vi.fn(),
  appendTicketNote: vi.fn(),
  addMem0Memory: vi.fn(),
  buildAgentContext: vi.fn(),
  fetchMemoryContext: vi.fn(),
  buildCrmChatSystemPrompt: vi.fn(),
  normalizeAppAgentMode: vi.fn(),
  getAgentToolsForIntent: vi.fn(),
  preClassify: vi.fn(),
  validatePricingInResponse: vi.fn(),
  instrumentToolsWithLatency: vi.fn((tools: unknown) => tools),
  nowMs: vi.fn(() => 0),
  recordLatencyMetric: vi.fn(),
  rateLimit: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("ai", () => ({
  streamText: hoisted.streamText,
  convertToModelMessages: hoisted.convertToModelMessages,
  stepCountIs: hoisted.stepCountIs,
  createUIMessageStream: hoisted.createUIMessageStream,
  createUIMessageStreamResponse: hoisted.createUIMessageStreamResponse,
}));
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: hoisted.createGoogleGenerativeAI,
}));
vi.mock("@/actions/chat-actions", () => ({
  saveUserMessage: hoisted.saveUserMessage,
  runAddContactNote: hoisted.runAddContactNote,
  runAddDealNote: hoisted.runAddDealNote,
  runAssignTeamMember: hoisted.runAssignTeamMember,
  runCreateContact: hoisted.runCreateContact,
  runCreateDraftInvoice: hoisted.runCreateDraftInvoice,
  runCreateJobNatural: hoisted.runCreateJobNatural,
  runCreateTask: hoisted.runCreateTask,
  runGetAttentionRequired: hoisted.runGetAttentionRequired,
  runGetConversationHistory: hoisted.runGetConversationHistory,
  runGetDealContext: hoisted.runGetDealContext,
  runGetInvoiceStatusAction: hoisted.runGetInvoiceStatusAction,
  runListRecentCrmChanges: hoisted.runListRecentCrmChanges,
  runMoveDeal: hoisted.runMoveDeal,
  runRestoreDeal: hoisted.runRestoreDeal,
  runSearchContacts: hoisted.runSearchContacts,
  runUndoLastAction: hoisted.runUndoLastAction,
  runUnassignDeal: hoisted.runUnassignDeal,
  runUpdateContactFields: hoisted.runUpdateContactFields,
  runUpdateDealFields: hoisted.runUpdateDealFields,
  runUpdateInvoiceAmount: hoisted.runUpdateInvoiceAmount,
}));
vi.mock("@/actions/agent-tools", () => ({
  runGetAvailability: hoisted.runGetAvailability,
  runGetClientContext: hoisted.runGetClientContext,
  runGetTodaySummary: hoisted.runGetTodaySummary,
}));
vi.mock("@/actions/deal-actions", () => ({
  getDeals: hoisted.getDeals,
}));
vi.mock("@/actions/settings-actions", () => ({
  getWorkspaceSettingsById: hoisted.getWorkspaceSettingsById,
}));
vi.mock("@/lib/chat-utils", () => ({
  buildJobDraftFromParams: hoisted.buildJobDraftFromParams,
  resolveSchedule: vi.fn((value: string) => ({ iso: new Date("2026-04-05T09:00:00.000Z").toISOString(), display: value })),
}));
vi.mock("@/lib/ai/job-parser", () => ({
  parseJobWithAI: hoisted.parseJobWithAI,
  parseMultipleJobsWithAI: hoisted.parseMultipleJobsWithAI,
  extractAllJobsFromParagraph: hoisted.extractAllJobsFromParagraph,
}));
vi.mock("@/actions/activity-actions", () => ({
  appendTicketNote: hoisted.appendTicketNote,
}));
vi.mock("@/lib/ai/context", () => ({
  addMem0Memory: hoisted.addMem0Memory,
  buildAgentContext: hoisted.buildAgentContext,
  fetchMemoryContext: hoisted.fetchMemoryContext,
}));
vi.mock("@/lib/ai/prompt-contract", () => ({
  buildCrmChatSystemPrompt: hoisted.buildCrmChatSystemPrompt,
}));
vi.mock("@/lib/agent-mode", () => ({
  normalizeAppAgentMode: hoisted.normalizeAppAgentMode,
}));
vi.mock("@/lib/ai/tools", () => ({
  getAgentToolsForIntent: hoisted.getAgentToolsForIntent,
}));
vi.mock("@/lib/ai/pre-classifier", () => ({
  preClassify: hoisted.preClassify,
}));
vi.mock("@/lib/ai/response-validator", () => ({
  validatePricingInResponse: hoisted.validatePricingInResponse,
}));
vi.mock("@/lib/telemetry/latency", () => ({
  instrumentToolsWithLatency: hoisted.instrumentToolsWithLatency,
  nowMs: hoisted.nowMs,
  recordLatencyMetric: hoisted.recordLatencyMetric,
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: hoisted.rateLimit,
}));
vi.mock("@/lib/logging", () => ({
  logger: {
    error: hoisted.loggerError,
  },
}));

import { POST, shouldAttemptStructuredJobExtraction } from "@/app/api/chat/route";

describe("POST /api/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    hoisted.rateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
    hoisted.preClassify.mockReturnValue({
      intent: "general",
      confidence: 0.3,
      contextHints: [],
      suggestedTools: [],
      requiresCalculator: false,
    });
    hoisted.convertToModelMessages.mockImplementation(async (messages: Array<{ role?: string; content?: string; parts?: Array<{ text?: string }> }>) =>
      messages.map((message) => ({
        role: message.role ?? "user",
        content: message.content ?? message.parts?.find((part) => typeof part.text === "string")?.text ?? "",
      })),
    );
    hoisted.buildAgentContext.mockResolvedValue({
      settings: { agentMode: "AUTO" },
      userRole: "OWNER",
      knowledgeBaseStr: "BUSINESS IDENTITY:\n- Business Name: Earlymark",
      agentModeStr: "CONTACT MODE: Backup AI",
      workingHoursStr: "WORKING HOURS: 8am to 5pm",
      agentScriptStr: "AGENT SCRIPT: Keep it crisp",
      allowedTimesStr: "ALLOWED TIMES: send between 8am and 6pm",
      preferencesStr: "PREFERENCES:\n- Be helpful",
      pricingRulesStr: "PRICING RULES:\n- Use approved prices",
      bouncerStr: "LEAD QUALIFICATION:\n- Hold risky leads for review",
      attachmentsStr: "BUSINESS DOCUMENTS:\n- Price book attached",
    });
    hoisted.getAgentToolsForIntent.mockReturnValue({});
    hoisted.buildCrmChatSystemPrompt.mockReturnValue("system prompt");
    hoisted.createGoogleGenerativeAI.mockReturnValue(() => ({ provider: "google-model" }));
    hoisted.streamText.mockReturnValue({
      toUIMessageStreamResponse: () =>
        new Response(JSON.stringify({ text: "model response" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    });
    hoisted.saveUserMessage.mockResolvedValue(undefined);
    hoisted.createUIMessageStream.mockImplementation(({ execute }: { execute: ({ writer }: { writer: { write: (event: { type?: string; delta?: string }) => void } }) => void }) => {
      const chunks: string[] = [];
      execute({
        writer: {
          write: (event) => {
            if (event.type === "text-delta" && typeof event.delta === "string") {
              chunks.push(event.delta);
            }
          },
        },
      });
      return { text: chunks.join("") };
    });
    hoisted.createUIMessageStreamResponse.mockImplementation(({ stream }: { stream: { text?: string } }) =>
      new Response(JSON.stringify({ text: stream.text ?? "" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rejects requests without a workspaceId", async () => {
    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [],
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "workspaceId is required" });
  });

  it("rate limits chat requests and returns retry metadata", async () => {
    hoisted.rateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 4500 });

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [],
        }),
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("5");
    expect(await response.json()).toEqual({
      error: "Too many requests. Please wait a moment.",
    });
  });

  it("fails fast when no Gemini API key is configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [],
        }),
      }),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Missing GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY",
    });
  });

  it("does not treat CRM update requests as structured job-creation drafts", () => {
    expect(
      shouldAttemptStructuredJobExtraction("Move Hot Water Fix to scheduled", {
        intent: "crm_action",
        confidence: 0.95,
        contextHints: [],
        suggestedTools: ["moveDeal"],
        requiresCalculator: false,
      }),
    ).toBe(false);

    expect(
      shouldAttemptStructuredJobExtraction("Create a new blocked drain job for Alex tomorrow at 2pm for $420", {
        intent: "crm_action",
        confidence: 0.95,
        contextHints: [],
        suggestedTools: ["createDeal"],
        requiresCalculator: false,
      }),
    ).toBe(true);

    expect(
      shouldAttemptStructuredJobExtraction("Create a new task called Check parts for Hot Water Service due tomorrow at 7am.", {
        intent: "crm_action",
        confidence: 0.95,
        contextHints: [],
        suggestedTools: ["createTask"],
        requiresCalculator: false,
      }),
    ).toBe(false);
  });

  it("routes common contact creation requests through the LLM/tool path with crm-action hints", async () => {
    hoisted.preClassify.mockReturnValue({
      intent: "crm_action",
      confidence: 0.92,
      contextHints: ["CRM ACTION REQUEST: Prefer using CRM mutation tools directly instead of saying you cannot do it."],
      suggestedTools: ["createContact"],
      requiresCalculator: false,
    });

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{ role: "user", parts: [{ type: "text", text: "Create a new contact called Alex Harper with phone 0400000101 and email alex@example.com." }] }],
        }),
      }),
    );
    expect(hoisted.runCreateContact).not.toHaveBeenCalled();
    expect(hoisted.streamText).toHaveBeenCalledTimes(1);
    expect(hoisted.buildCrmChatSystemPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        intentHintBlock: expect.stringContaining("CRM ACTION REQUEST"),
        workspaceContextBlocks: expect.arrayContaining([
          "BUSINESS IDENTITY:\n- Business Name: Earlymark",
          "WORKING HOURS: 8am to 5pm",
          "PREFERENCES:\n- Be helpful",
        ]),
      }),
    );
    expect(await response.json()).toEqual({ text: "model response" });
  });

  it("keeps broader natural-language job creation on the LLM/tool path", async () => {
    hoisted.preClassify.mockReturnValue({
      intent: "crm_action",
      confidence: 0.92,
      contextHints: ["CRM ACTION REQUEST: Prefer using CRM mutation tools directly instead of saying you cannot do it."],
      suggestedTools: ["createJobNatural"],
      requiresCalculator: false,
    });
    hoisted.extractAllJobsFromParagraph.mockResolvedValue([]);
    hoisted.parseJobWithAI.mockResolvedValue(null);

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{ role: "user", parts: [{ type: "text", text: "Book Alex Harper in for a blocked drain at 12 Test Street Sydney for $420 tomorrow." }] }],
        }),
      }),
    );

    expect(hoisted.runCreateJobNatural).not.toHaveBeenCalled();
    expect(hoisted.streamText).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ text: "model response" });
  });

  it("injects likely contact context for contact lookups while keeping the model in charge", async () => {
    hoisted.preClassify.mockReturnValue({
      intent: "contact_lookup",
      confidence: 0.9,
      contextHints: ["CONTACT QUERY: Use searchContacts or getClientContext to find the person first."],
      suggestedTools: ["searchContacts", "getClientContext"],
      requiresCalculator: false,
    });
    hoisted.runGetClientContext.mockResolvedValue({
      client: {
        id: "contact_1",
        name: "Alex Harper",
        email: "alex@example.com",
        phone: "0400000101",
        company: null,
        address: "12 Test Street Sydney",
      },
      recentNotes: [{ title: "AI note added", content: "Call after lunch.", createdAt: "2026-04-04T00:00:00.000Z" }],
      recentMessages: [],
      recentJobs: [{ id: "deal_1", title: "Blocked Drain", stage: "Scheduled", scheduledAt: null }],
    });

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{ role: "user", parts: [{ type: "text", text: "What phone number and email do you have on file for Alex Harper?" }] }],
        }),
      }),
    );

    expect(hoisted.streamText).toHaveBeenCalledTimes(1);
    expect(hoisted.buildCrmChatSystemPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        intentHintBlock: expect.stringContaining("CONTACT QUERY"),
        resolvedEntitiesBlock: expect.stringMatching(/Likely contact: Alex Harper[\s\S]*Latest contact note for Alex Harper: Call after lunch\./),
        workspaceContextBlocks: expect.arrayContaining([
          expect.stringContaining("CURRENT DATE/TIME:"),
        ]),
      }),
    );
    const promptArgs = hoisted.buildCrmChatSystemPrompt.mock.calls.at(-1)?.[0];
    expect(promptArgs.workspaceContextBlocks).not.toContain("PRICING RULES:\n- Use approved prices");
    expect(await response.json()).toEqual({ text: "model response" });
  });

  it("formats ambiguous contact context with useful disambiguation details", async () => {
    hoisted.preClassify.mockReturnValue({
      intent: "contact_lookup",
      confidence: 0.9,
      contextHints: ["CONTACT QUERY: Use searchContacts or getClientContext to find the person first."],
      suggestedTools: ["searchContacts", "getClientContext"],
      requiresCalculator: false,
    });
    hoisted.runGetClientContext.mockResolvedValue({
      client: null,
      ambiguousMatches: [
        {
          id: "contact_1",
          name: "Alex Harper",
          phone: "0400000001",
          email: "alex.one@example.com",
          company: "Alpha Plumbing",
        },
        {
          id: "contact_2",
          name: "Alex Harper",
          phone: "0400000002",
          email: "alex.two@example.com",
          company: "Beta Electrical",
        },
      ],
      recentNotes: [],
      recentMessages: [],
      recentJobs: [],
    });

    await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{ role: "user", parts: [{ type: "text", text: "Find contact Alex Harper" }] }],
        }),
      }),
    );

    expect(hoisted.streamText).toHaveBeenCalledTimes(1);
    expect(hoisted.buildCrmChatSystemPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        resolvedEntitiesBlock: expect.stringContaining('Ambiguous contacts for "Alex Harper":'),
      }),
    );
    const promptArgs = hoisted.buildCrmChatSystemPrompt.mock.calls.at(-1)?.[0];
    expect(promptArgs.resolvedEntitiesBlock).toContain("phone 0400000001");
    expect(promptArgs.resolvedEntitiesBlock).toContain("email alex.two@example.com");
    expect(promptArgs.resolvedEntitiesBlock).toContain("Ask the user which one they mean instead of guessing");
    expect(promptArgs.resolvedEntitiesBlock).toContain("option number");
  });

  it("resolves numbered contact disambiguation replies into the selected contact record", async () => {
    hoisted.runGetClientContext
      .mockResolvedValueOnce({
        client: {
          id: "contact_2",
          name: "Alex Harper",
          email: "alex.two@example.com",
          phone: "0400000002",
          company: "Beta Electrical",
          address: null,
        },
        recentNotes: [],
        recentMessages: [],
        recentJobs: [],
        ambiguousMatches: [],
      })
      .mockResolvedValueOnce({
        client: {
          id: "contact_2",
          name: "Alex Harper",
          email: "alex.two@example.com",
          phone: "0400000002",
          company: "Beta Electrical",
          address: "22 Harbour Road",
        },
        recentNotes: [{ title: "Latest note", content: "Prefers afternoons.", createdAt: "2026-04-04T00:00:00.000Z" }],
        recentMessages: [],
        recentJobs: [],
        ambiguousMatches: [],
      });

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [
            { role: "user", parts: [{ type: "text", text: "Find contact Alex Harper" }] },
            {
              role: "assistant",
              content:
                "I found multiple contacts that match. Tell me which one you mean:\n1. Alex Harper (company Alpha Plumbing, phone 0400000001, email alex.one@example.com)\n2. Alex Harper (company Beta Electrical, phone 0400000002, email alex.two@example.com)\nReply with the option number, phone number, email, company name, or full contact name and I'll open the right record.",
            },
            { role: "user", parts: [{ type: "text", text: "2" }] },
          ],
        }),
      }),
    );

    expect(hoisted.streamText).not.toHaveBeenCalled();
    expect(hoisted.runGetClientContext).toHaveBeenNthCalledWith(1, "ws_1", { clientName: "0400000002" });
    expect(hoisted.runGetClientContext).toHaveBeenNthCalledWith(2, "ws_1", { clientId: "contact_2", clientName: "Alex Harper" });
    expect(await response.json()).toEqual({
      text: expect.stringContaining("Beta Electrical"),
    });
  });

  it("asks for a valid option number when a numbered disambiguation reply is out of range", async () => {
    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [
            { role: "user", parts: [{ type: "text", text: "Find contact Alex Harper" }] },
            {
              role: "assistant",
              content:
                "I found multiple contacts that match. Tell me which one you mean:\n1. Alex Harper (company Alpha Plumbing, phone 0400000001, email alex.one@example.com)\n2. Alex Harper (company Beta Electrical, phone 0400000002, email alex.two@example.com)\nReply with the option number, phone number, email, company name, or full contact name and I'll open the right record.",
            },
            { role: "user", parts: [{ type: "text", text: "5" }] },
          ],
        }),
      }),
    );

    expect(hoisted.streamText).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      text: "I only listed 2 contact options. Reply with a number from that list and I'll open the right record.",
    });
  });

  it("injects current workspace date and likely job context for next-step completion questions", async () => {
    hoisted.preClassify.mockReturnValue({
      intent: "crm_action",
      confidence: 0.92,
      contextHints: ["For blockers or next-step questions, use getDealContext first, then explain what is still missing instead of asking the user what action they want to take."],
      suggestedTools: ["getDealContext", "getInvoiceStatus"],
      requiresCalculator: false,
    });
    hoisted.getDeals.mockResolvedValue([
      {
        id: "deal_1",
        title: "Gutter Repair",
        stage: "SCHEDULED",
        scheduledAt: new Date("2026-04-05T01:00:00.000Z"),
      },
    ]);

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{ role: "user", parts: [{ type: "text", text: "What still needs to happen before Gutter Repair can be completed?" }] }],
        }),
      }),
    );

    expect(hoisted.streamText).toHaveBeenCalledTimes(1);
    expect(hoisted.buildCrmChatSystemPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        resolvedEntitiesBlock: expect.stringContaining("Likely jobs: Gutter Repair"),
        workspaceContextBlocks: expect.arrayContaining([
          expect.stringContaining("Use this as the authoritative reference for relative dates"),
        ]),
      }),
    );
    expect(await response.json()).toEqual({ text: "model response" });
  });

  it("injects likely deal context for crm mutations without bypassing the LLM", async () => {
    hoisted.preClassify.mockReturnValue({
      intent: "crm_action",
      confidence: 0.9,
      contextHints: ["CRM ACTION REQUEST: Prefer using CRM mutation tools directly instead of saying you cannot do it."],
      suggestedTools: ["moveDeal"],
      requiresCalculator: false,
    });
    hoisted.getDeals.mockResolvedValue([
      {
        id: "deal_1",
        title: "Blocked Drain",
        stage: "SCHEDULED",
        scheduledAt: new Date("2026-04-05T01:00:00.000Z"),
      },
    ]);

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{ role: "user", parts: [{ type: "text", text: "Move Blocked Drain to scheduled tomorrow morning." }] }],
        }),
      }),
    );

    expect(hoisted.streamText).toHaveBeenCalledTimes(1);
    expect(hoisted.buildCrmChatSystemPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        resolvedEntitiesBlock: expect.stringContaining("Likely jobs: Blocked Drain"),
      }),
    );
    expect(await response.json()).toEqual({ text: "model response" });
  });

  it("gives invoice flows a larger adaptive step budget", async () => {
    hoisted.preClassify.mockReturnValue({
      intent: "invoice",
      confidence: 0.93,
      contextHints: [
        "INVOICE REQUEST: Use the invoice tools (createDraftInvoice, issueInvoice, etc.).",
        "QUOTE = DRAFT INVOICE: When the user asks to create a quote or estimate, use createDraftInvoice.",
      ],
      suggestedTools: ["createDraftInvoice", "updateInvoiceFields", "updateInvoiceAmount"],
      requiresCalculator: true,
    });
    hoisted.stepCountIs.mockImplementation((count: number) => count);

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{ role: "user", parts: [{ type: "text", text: "Create a quote for Alex Harper for $350." }] }],
        }),
      }),
    );

    expect(hoisted.stepCountIs).toHaveBeenCalledWith(5);
    expect(hoisted.streamText).toHaveBeenCalledTimes(1);
    expect(await response.json()).toEqual({ text: "model response" });
  });

  it("includes multi-step execution guidance for combined invoice workflows", async () => {
    hoisted.preClassify.mockReturnValue({
      intent: "invoice",
      confidence: 0.93,
      contextHints: [
        "INVOICE REQUEST: Use the invoice tools (createDraftInvoice, issueInvoice, etc.).",
        "QUOTE = DRAFT INVOICE: When the user asks to create a quote or estimate, use createDraftInvoice (not createJobNatural). If a dollar amount is given, update the actual invoice total via updateInvoiceFields (with total: amount) after creation — this correctly updates the invoice document. Also update the deal's tracked amount via updateInvoiceAmount. After creating the draft and setting the amount, move the deal to 'Quote Sent' if it is still in 'New Request'.",
      ],
      suggestedTools: ["createDraftInvoice", "updateInvoiceFields", "updateInvoiceAmount", "issueInvoice"],
      requiresCalculator: true,
    });

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{
            role: "user",
            parts: [{ type: "text", text: "Create a quote for Alex Harper for $350 and then send it to him." }],
          }],
        }),
      }),
    );

    expect(hoisted.buildCrmChatSystemPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        intentHintBlock: expect.stringContaining("QUOTE = DRAFT INVOICE"),
        roleGuardBlock: expect.stringContaining("MULTI-STEP EXECUTION"),
      }),
    );
    expect(await response.json()).toEqual({ text: "model response" });
  });

  it("answers bouncer policy prompts directly", async () => {
    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{ role: "user", parts: [{ type: "text", text: "A lead is far away but maybe acceptable. Should that be a hard decline or a warning review?" }] }],
        }),
      }),
    );

    expect(hoisted.streamText).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      text: "That should be a warning review, not a hard decline. Hold the lead without replying yet, add an orange-badge style warning for distance/risk, and surface it in the evening briefing so the user can decide whether to take it.",
    });
  });

  it("executes exact task creation prompts directly to avoid job-draft loops", async () => {
    hoisted.runCreateTask.mockResolvedValue('Successfully created task: "Check parts for Hot Water Service" due at 5/04/2026, 7:00:00 am');

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{ role: "user", parts: [{ type: "text", text: "Create a new task called Check parts for Hot Water Service due tomorrow at 7am." }] }],
        }),
      }),
    );

    expect(hoisted.runCreateTask).toHaveBeenCalled();
    expect(hoisted.streamText).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      text: 'Successfully created task: "Check parts for Hot Water Service" due at 5/04/2026, 7:00:00 am',
    });
  });

  it("answers awaiting-payment aggregate queries directly from crm state", async () => {
    hoisted.getDeals.mockResolvedValue([
      {
        id: "deal_1",
        title: "ZZZ AUTO test Blocked Drain",
        company: "",
        contactName: "Alex Harper",
        stage: "ready_to_invoice",
        invoicedAmount: undefined,
      },
      {
        id: "deal_2",
        title: "ZZZ AUTO test Hot Water Service",
        company: "",
        contactName: "Brianna Cole",
        stage: "completed",
        invoicedAmount: 2680,
      },
    ]);

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{ role: "user", parts: [{ type: "text", text: "What jobs for ZZZ AUTO test are ready to invoice or already invoiced?" }] }],
        }),
      }),
    );

    expect(hoisted.streamText).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      text: 'Jobs matching "ZZZ AUTO test" that are awaiting payment or already invoiced:\n- ZZZ AUTO test Blocked Drain (Awaiting payment)\n- ZZZ AUTO test Hot Water Service (Completed; invoice $2680)',
    });
  });

  it("answers incomplete-or-blocked aggregate queries directly from crm state", async () => {
    hoisted.getDeals.mockResolvedValue([
      {
        id: "deal_1",
        title: "ZZZ AUTO test Blocked Drain",
        company: "",
        contactName: "Alex Harper",
        stage: "scheduled",
        health: { status: "STALE" },
        scheduledAt: null,
        actualOutcome: null,
        metadata: null,
      },
      {
        id: "deal_2",
        title: "ZZZ AUTO test Completed Job",
        company: "",
        contactName: "Brianna Cole",
        stage: "completed",
        health: { status: "HEALTHY" },
        scheduledAt: null,
        actualOutcome: null,
        metadata: null,
      },
    ]);

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{ role: "user", parts: [{ type: "text", text: "What jobs for ZZZ AUTO test look incomplete or blocked?" }] }],
        }),
      }),
    );

    expect(hoisted.streamText).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      text: 'Jobs matching "ZZZ AUTO test" that still look incomplete or blocked:\n- ZZZ AUTO test Blocked Drain (Scheduled; Stale)',
    });
  });

  it("does not turn a fully specified create-job request into a draft-card extraction before the llm path", () => {
    expect(
      shouldAttemptStructuredJobExtraction("Create a new job called Blocked Drain for Alex Harper at 12 Test Street Sydney with a quoted value of $420.", {
        intent: "crm_action",
        confidence: 0.95,
        contextHints: [],
        suggestedTools: ["createJobNatural"],
        requiresCalculator: false,
      }),
    ).toBe(false);
  });

  it("keeps direct blocked-job aggregate filters strict on whole-word query matches", async () => {
    hoisted.getDeals.mockResolvedValue([
      {
        id: "deal_1",
        title: "Office Fitout Quote",
        company: "",
        contactName: "ZZZ AUTO livefull_after_fastpath Charlie Dental",
        stage: "quote_sent",
        health: { status: "STALE" },
        scheduledAt: null,
        actualOutcome: null,
        metadata: null,
      },
      {
        id: "deal_2",
        title: "ZZZ AUTO LIVE Blocked Drain",
        company: "",
        contactName: "Alex Harper",
        stage: "scheduled",
        health: { status: "STALE" },
        scheduledAt: null,
        actualOutcome: null,
        metadata: null,
      },
    ]);

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [{ role: "user", parts: [{ type: "text", text: "What jobs for ZZZ AUTO LIVE look incomplete or blocked?" }] }],
        }),
      }),
    );

    expect(hoisted.streamText).not.toHaveBeenCalled();
    expect(await response.json()).toEqual({
      text: 'Jobs matching "ZZZ AUTO LIVE" that still look incomplete or blocked:\n- ZZZ AUTO LIVE Blocked Drain (Scheduled; Stale)',
    });
  });
});
