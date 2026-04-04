import { describe, expect, it, vi } from "vitest";

vi.mock("@/actions/chat-actions", () => ({
  runMoveDeal: vi.fn(),
  runBulkMoveDeals: vi.fn(),
  runBulkAssignDeals: vi.fn(),
  runBulkSetDealDisposition: vi.fn(),
  runBulkCreateDealReminder: vi.fn(),
  runListDeals: vi.fn(),
  runGetAttentionRequired: vi.fn(),
  runCreateDeal: vi.fn(),
  runUpdateDealFields: vi.fn(),
  runCreateJobNatural: vi.fn(),
  runProposeReschedule: vi.fn(),
  runUpdateInvoiceAmount: vi.fn(),
  runCreateDraftInvoice: vi.fn(),
  runIssueInvoiceAction: vi.fn(),
  runMarkInvoicePaidAction: vi.fn(),
  runUpdateInvoiceFields: vi.fn(),
  runVoidInvoice: vi.fn(),
  runReverseInvoiceStatus: vi.fn(),
  runSendInvoiceReminder: vi.fn(),
  runGetInvoiceStatusAction: vi.fn(),
  runUpdateAiPreferences: vi.fn(),
  runLogActivity: vi.fn(),
  runAddDealNote: vi.fn(),
  runAddContactNote: vi.fn(),
  runCreateTask: vi.fn(),
  runSearchContacts: vi.fn(),
  runGetDealContext: vi.fn(),
  runCreateContact: vi.fn(),
  runUpdateContactFields: vi.fn(),
  runSendSms: vi.fn(),
  runSendEmail: vi.fn(),
  runMakeCall: vi.fn(),
  runGetConversationHistory: vi.fn(),
  runCreateScheduledNotification: vi.fn(),
  runCompleteTaskByTitle: vi.fn(),
  runDeleteTaskByTitle: vi.fn(),
  runListRecentCrmChanges: vi.fn(),
  runUndoLastAction: vi.fn(),
  runRevertDealStageMove: vi.fn(),
  runUnassignDeal: vi.fn(),
  runRestoreDeal: vi.fn(),
  runAssignTeamMember: vi.fn(),
  handleSupportRequest: vi.fn(),
  runAppendTicketNote: vi.fn(),
  recordManualRevenue: vi.fn(),
  runAddAgentFlag: vi.fn(),
}));

vi.mock("@/actions/agent-tools", () => ({
  runGetSchedule: vi.fn(),
  runSearchJobHistory: vi.fn(),
  runGetFinancialReport: vi.fn(),
  runGetClientContext: vi.fn(),
  runGetTodaySummary: vi.fn(),
  runGetAvailability: vi.fn(),
}));

vi.mock("@/actions/pricing-actions", () => ({ runPricingLookup: vi.fn() }));
vi.mock("@/lib/ai/pricing-calculator", () => ({ calculate: vi.fn() }));
vi.mock("@/lib/chat-utils", () => ({ buildJobDraftFromParams: vi.fn() }));

import { getAgentToolsForIntent } from "@/lib/ai/tools";

describe("ai tool routing", () => {
  it("keeps core CRM mutation tools available for crm_action turns", () => {
    const tools = getAgentToolsForIntent(
      "ws_1",
      null,
      "user_1",
      {
        intent: "crm_action",
        confidence: 0.95,
        contextHints: [],
        suggestedTools: ["moveDeal"],
        requiresCalculator: false,
      },
    );

    expect(Object.keys(tools)).toEqual(expect.arrayContaining([
      "moveDeal",
      "updateDealFields",
      "assignTeamMember",
      "addDealNote",
      "addContactNote",
      "getDealContext",
      "searchContacts",
    ]));
  });

  it("keeps flow-control turns lean", () => {
    const tools = getAgentToolsForIntent(
      "ws_1",
      null,
      "user_1",
      {
        intent: "flow_control",
        confidence: 1,
        contextHints: [],
        suggestedTools: [],
        requiresCalculator: false,
      },
    );

    expect(Object.keys(tools)).toEqual(expect.arrayContaining([
      "showConfirmationCard",
      "showJobDraftForConfirmation",
      "undoLastAction",
    ]));
    expect(Object.keys(tools)).not.toContain("moveDeal");
    expect(Object.keys(tools)).not.toContain("createContact");
  });
});
