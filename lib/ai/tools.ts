import { tool } from "ai";
import { z } from "zod";
import type { PreClassification } from "@/lib/ai/pre-classifier";
import {
    runMoveDeal,
    runBulkMoveDeals,
    runBulkAssignDeals,
    runBulkSetDealDisposition,
    runBulkCreateDealReminder,
    runListDeals,
    runGetAttentionRequired,
    runCreateDeal,
    runUpdateDealFields,
    runCreateJobNatural,
    runProposeReschedule,
    runUpdateInvoiceAmount,
    runCreateDraftInvoice,
    runIssueInvoiceAction,
    runMarkInvoicePaidAction,
    runUpdateInvoiceFields,
    runVoidInvoice,
    runReverseInvoiceStatus,
    runSendInvoiceReminder,
    runGetInvoiceStatusAction,
    runUpdateAiPreferences,
    runLogActivity,
    runCreateTask,
    runSearchContacts,
    runCreateContact,
    runUpdateContactFields,
    runSendSms,
    runSendEmail,
    runMakeCall,
    runGetConversationHistory,
    runCreateScheduledNotification,
    runCompleteTaskByTitle,
    runDeleteTaskByTitle,
    runListRecentCrmChanges,
    runUndoLastAction,
    runRevertDealStageMove,
    runUnassignDeal,
    runRestoreDeal,
    runAssignTeamMember,
    handleSupportRequest,
    runAppendTicketNote,
    recordManualRevenue,
    runAddAgentFlag,
} from "@/actions/chat-actions";
import {
    runGetSchedule,
    runSearchJobHistory,
    runGetFinancialReport,
    runGetClientContext,
    runGetTodaySummary,
    runGetAvailability,
} from "@/actions/agent-tools";
import { runPricingLookup } from "@/actions/pricing-actions";
import { calculate } from "@/lib/ai/pricing-calculator";
import { buildJobDraftFromParams } from "@/lib/chat-utils";
import type { WeeklyHours } from "@/lib/working-hours";

/**
 * Returns the record of tool definitions for the AI agent to use, bound to a specific workspace and settings.
 *
 * @param workspaceId - The ID of the workspace.
 * @param settings - The workspace settings, used for availability mapping.
 * @param userId - Optional user ID for operations requiring it (e.g., support requests).
 */
type AgentToolSettings = {
    workingHoursStart?: string | null;
    workingHoursEnd?: string | null;
    workspaceTimezone?: string | null;
    weeklyHours?: WeeklyHours;
} & Record<string, unknown>;

export function getAgentTools(workspaceId: string, settings: AgentToolSettings | null | undefined, userId?: string) {
    return {
        listDeals: tool({
            description: "List all jobs in the pipeline (id, title, stage, value).",
            inputSchema: z.object({}),
            execute: async () => runListDeals(workspaceId),
        }),
        getAttentionRequired: tool({
            description: "Audit jobs that need attention (overdue, stale, rotting, rejected, parked) and return quick-action prompts.",
            inputSchema: z.object({}),
            execute: async () => runGetAttentionRequired(workspaceId),
        }),
        moveDeal: tool({
            description: "Move a job to a different stage (completed, quoted, scheduled, in progress, new request, pipeline, ready to invoice, deleted).",
            inputSchema: z.object({
                dealTitle: z.string().describe("Name/title of the deal or job to move"),
                newStage: z.string().describe("Target stage name"),
            }),
            execute: async ({ dealTitle, newStage }) =>
                runMoveDeal(workspaceId, dealTitle.trim(), newStage.trim()),
        }),
        bulkMoveDeals: tool({
            description: "Bulk move selected jobs/deals by their explicit IDs to a new stage. Use only when the target set is explicitly selected.",
            inputSchema: z.object({
                dealIds: z.array(z.string()).min(1).describe("Selected deal IDs"),
                newStage: z.string().describe("Target stage name"),
            }),
            execute: async ({ dealIds, newStage }) => runBulkMoveDeals(workspaceId, { dealIds, newStage }),
        }),
        bulkAssignDeals: tool({
            description: "Bulk assign selected jobs/deals to a team member. Use only when the target set is explicitly selected.",
            inputSchema: z.object({
                dealIds: z.array(z.string()).min(1).describe("Selected deal IDs"),
                teamMemberName: z.string().describe("Team member name or email"),
            }),
            execute: async ({ dealIds, teamMemberName }) => runBulkAssignDeals(workspaceId, { dealIds, teamMemberName }),
        }),
        bulkUpdateDealDisposition: tool({
            description: "Bulk mark selected jobs/deals as lost, deleted, or archived. Use only when the target set is explicitly selected.",
            inputSchema: z.object({
                dealIds: z.array(z.string()).min(1).describe("Selected deal IDs"),
                disposition: z.enum(["lost", "deleted", "archived"]).describe("Target disposition"),
            }),
            execute: async ({ dealIds, disposition }) => runBulkSetDealDisposition(workspaceId, { dealIds, disposition }),
        }),
        bulkCreateDealReminder: tool({
            description: "Create one shared reminder/task across selected jobs/deals. Use only when the target set is explicitly selected.",
            inputSchema: z.object({
                dealIds: z.array(z.string()).min(1).describe("Selected deal IDs"),
                title: z.string().describe("Reminder title"),
                message: z.string().describe("Reminder details"),
                scheduledAtISO: z.string().optional().describe("ISO due time"),
            }),
            execute: async (params) => runBulkCreateDealReminder(workspaceId, params),
        }),
        createDeal: tool({
            description: "Create a new deal/job.",
            inputSchema: z.object({
                title: z.string().describe("Deal or job title"),
                company: z.string().optional().describe("Client or company name"),
                value: z.number().optional().describe("Deal value in dollars"),
            }),
            execute: async ({ title, company, value }) =>
                runCreateDeal(workspaceId, { title, company, value }),
        }),
        updateDealFields: tool({
            description: "Update job/deal fields like title, value, address, schedule, or stage.",
            inputSchema: z.object({
                dealTitle: z.string().describe("Current job/deal title"),
                newTitle: z.string().optional().describe("New title"),
                value: z.number().optional().describe("New value in dollars"),
                address: z.string().optional().describe("New address"),
                schedule: z.string().optional().describe("New schedule, e.g. tomorrow 2pm"),
                newStage: z.string().optional().describe("New stage name"),
            }),
            execute: async (params) => runUpdateDealFields(workspaceId, params),
        }),
        createJobNatural: tool({
            description: "Create a job from natural language. Always extract phone if included. Pass schedule when date/time is mentioned.",
            inputSchema: z.object({
                clientName: z.string().describe("Client full name"),
                workDescription: z.string().describe("What work is needed"),
                price: z.number().describe("Price in dollars"),
                address: z.string().optional().describe("Street address"),
                schedule: z.string().optional().describe("When, e.g. tomorrow 2pm"),
                phone: z.string().optional().describe("Client phone number"),
                email: z.string().optional().describe("Client email"),
            }),
            execute: async (params) => runCreateJobNatural(workspaceId, params),
        }),
        showJobDraftForConfirmation: tool({
            description: "Show a draft CARD with Confirm/Cancel buttons. REQUIRED for multi-job flows — never use plain text for job details.",
            inputSchema: z.object({
                clientName: z.string().describe("Client full name"),
                workDescription: z.string().describe("What work is needed"),
                price: z.number().describe("Price in dollars"),
                address: z.string().optional().describe("Street address"),
                schedule: z.string().optional().describe("When, e.g. tomorrow 2pm"),
                phone: z.string().optional().describe("Client phone number"),
                email: z.string().optional().describe("Client email"),
            }),
            execute: async (params) => {
                const draft = buildJobDraftFromParams({
                    clientName: params.clientName,
                    workDescription: params.workDescription,
                    price: params.price,
                    address: params.address,
                    schedule: params.schedule,
                    phone: params.phone,
                    email: params.email,
                });
                return { draft };
            },
        }),
        proposeReschedule: tool({
            description: "Propose a new time for an existing job. Logs the time, adds a note, creates a follow-up task.",
            inputSchema: z.object({
                dealTitle: z.string().describe("Job/deal title"),
                proposedSchedule: z.string().describe("New proposed time, e.g. tomorrow 3pm"),
            }),
            execute: async ({ dealTitle, proposedSchedule }) =>
                runProposeReschedule(workspaceId, { dealTitle, proposedSchedule }),
        }),
        updateInvoiceAmount: tool({
            description: "Update the final invoiced amount for a job.",
            inputSchema: z.object({
                dealTitle: z.string().describe("Job/deal title to invoice"),
                amount: z.number().describe("Final invoiced amount"),
            }),
            execute: async ({ dealTitle, amount }) =>
                runUpdateInvoiceAmount(workspaceId, { dealTitle, amount }),
        }),
        createDraftInvoice: tool({
            description: "Create a draft invoice for a job/deal using its current value when no draft exists yet.",
            inputSchema: z.object({
                dealTitle: z.string().describe("Job/deal title"),
            }),
            execute: async ({ dealTitle }) => runCreateDraftInvoice(workspaceId, { dealTitle }),
        }),
        issueInvoice: tool({
            description: "Issue/send the most relevant invoice by invoice ID, deal title, or contact name.",
            inputSchema: z.object({
                invoiceId: z.string().optional().describe("Invoice ID if already known"),
                dealTitle: z.string().optional().describe("Deal title to resolve latest invoice"),
                contactName: z.string().optional().describe("Contact name to resolve latest invoice"),
            }),
            execute: async (params) => runIssueInvoiceAction(workspaceId, params),
        }),
        updateInvoiceFields: tool({
            description: "Edit a draft or issued invoice's number, line items, totals, or issued date.",
            inputSchema: z.object({
                invoiceId: z.string().optional().describe("Invoice ID if already known"),
                dealTitle: z.string().optional().describe("Deal title to resolve latest invoice"),
                contactName: z.string().optional().describe("Contact name to resolve latest invoice"),
                number: z.string().optional().describe("Updated invoice number"),
                lineItems: z.array(z.object({
                    desc: z.string().describe("Line item description"),
                    price: z.number().describe("Line item price"),
                    qty: z.number().optional().describe("Quantity; defaults to 1"),
                })).optional().describe("Replacement invoice line items"),
                subtotal: z.number().optional().describe("Updated subtotal"),
                tax: z.number().optional().describe("Updated tax"),
                total: z.number().optional().describe("Updated total"),
                issuedAtISO: z.string().nullable().optional().describe("Updated issued date as ISO string, or null to clear it"),
            }),
            execute: async (params) => runUpdateInvoiceFields(workspaceId, params),
        }),
        markInvoicePaid: tool({
            description: "Mark the most relevant invoice as paid by invoice ID, deal title, or contact name.",
            inputSchema: z.object({
                invoiceId: z.string().optional().describe("Invoice ID if already known"),
                dealTitle: z.string().optional().describe("Deal title to resolve latest invoice"),
                contactName: z.string().optional().describe("Contact name to resolve latest invoice"),
            }),
            execute: async (params) => runMarkInvoicePaidAction(workspaceId, params),
        }),
        voidInvoice: tool({
            description: "Void a draft or issued invoice. Paid invoices must be reversed out of PAID before voiding.",
            inputSchema: z.object({
                invoiceId: z.string().optional().describe("Invoice ID if already known"),
                dealTitle: z.string().optional().describe("Deal title to resolve latest invoice"),
                contactName: z.string().optional().describe("Contact name to resolve latest invoice"),
            }),
            execute: async (params) => runVoidInvoice(workspaceId, params),
        }),
        reverseInvoiceStatus: tool({
            description: "Reverse an invoice status to a prior valid state.",
            inputSchema: z.object({
                invoiceId: z.string().optional().describe("Invoice ID if already known"),
                dealTitle: z.string().optional().describe("Deal title to resolve latest invoice"),
                contactName: z.string().optional().describe("Contact name to resolve latest invoice"),
                targetStatus: z.enum(["DRAFT", "ISSUED"]).describe("Status to revert the invoice to"),
            }),
            execute: async (params) => runReverseInvoiceStatus(workspaceId, params),
        }),
        sendInvoiceReminder: tool({
            description: "Send an invoice reminder using the existing customer-contact mode enforcement.",
            inputSchema: z.object({
                invoiceId: z.string().optional().describe("Invoice ID if already known"),
                dealTitle: z.string().optional().describe("Deal title to resolve latest invoice"),
                contactName: z.string().optional().describe("Contact name to resolve latest invoice"),
                channel: z.enum(["auto", "email", "sms"]).optional().describe("Preferred reminder channel"),
            }),
            execute: async (params) => runSendInvoiceReminder(workspaceId, params),
        }),
        getInvoiceStatus: tool({
            description: "Show local invoice status plus accounting sync status.",
            inputSchema: z.object({
                invoiceId: z.string().optional().describe("Invoice ID if already known"),
                dealTitle: z.string().optional().describe("Deal title to resolve latest invoice"),
                contactName: z.string().optional().describe("Contact name to resolve latest invoice"),
            }),
            execute: async (params) => runGetInvoiceStatusAction(workspaceId, params),
        }),
        updateAiPreferences: tool({
            description: "Add a permanent rule/preference. The assistant will save it in the strongest enforceable way available and repeat the exact rule it will enforce. If it conflicts, it will refuse.",
            inputSchema: z.object({
                rule: z.string().describe("The exact rule text to save (e.g. \"Don't do gas work\", \"Call-out fee is $0\")."),
            }),
            execute: async ({ rule }) => runUpdateAiPreferences(workspaceId, rule),
        }),
        logActivity: tool({
            description: "Record a call, job update, note, or email.",
            inputSchema: z.object({
                type: z.enum(["CALL", "EMAIL", "NOTE", "MEETING", "TASK"]).describe("Activity type"),
                content: z.string().describe("What happened"),
            }),
            execute: async ({ type, content }) => runLogActivity({ type, content }),
        }),
        createTask: tool({
            description: "Create a reminder or to-do task.",
            inputSchema: z.object({
                title: z.string().describe("Task title"),
                dueAtISO: z.string().optional().describe("ISO due date. Default: tomorrow 9am."),
                description: z.string().optional().describe("Extra details"),
            }),
            execute: async (params) => runCreateTask(params),
        }),
        completeTask: tool({
            description: "Mark a task as complete by its title.",
            inputSchema: z.object({
                title: z.string().describe("Task title"),
            }),
            execute: async ({ title }) => runCompleteTaskByTitle(workspaceId, title),
        }),
        deleteTask: tool({
            description: "Delete a task by its title.",
            inputSchema: z.object({
                title: z.string().describe("Task title"),
            }),
            execute: async ({ title }) => runDeleteTaskByTitle(workspaceId, title),
        }),
        searchContacts: tool({
            description: "Look up contacts by name or keyword in the CRM.",
            inputSchema: z.object({
                query: z.string().describe("Name or keyword to search"),
            }),
            execute: async ({ query }) => runSearchContacts(workspaceId, query),
        }),
        createContact: tool({
            description: "Add a new contact to the CRM.",
            inputSchema: z.object({
                name: z.string().describe("Full name or company name"),
                email: z.string().optional().describe("Email address"),
                phone: z.string().optional().describe("Phone number"),
            }),
            execute: async (params) => runCreateContact(workspaceId, params),
        }),
        updateContactFields: tool({
            description: "Update contact fields like name, phone, email, address, or company.",
            inputSchema: z.object({
                contactName: z.string().describe("Existing contact name"),
                newName: z.string().optional().describe("Updated name"),
                email: z.string().optional().describe("Updated email"),
                phone: z.string().optional().describe("Updated phone"),
                address: z.string().optional().describe("Updated address"),
                company: z.string().optional().describe("Updated company"),
            }),
            execute: async (params) => runUpdateContactFields(workspaceId, params),
        }),
        sendSms: tool({
            description: "Send an SMS to a contact by name. When this is customer-facing outreach, Tracey for users mode applies: execute sends immediately, review & approve drafts without sending, info only blocks sending.",
            inputSchema: z.object({
                contactName: z.string().describe("Contact name"),
                message: z.string().describe("SMS message to send"),
            }),
            execute: async ({ contactName, message }) =>
                runSendSms(workspaceId, { contactName, message, enforceCustomerContactMode: true }),
        }),
        sendEmail: tool({
            description: "Send an email to a contact by name. When this is customer-facing outreach, Tracey for users mode applies: execute sends immediately, review & approve drafts without sending, info only blocks sending.",
            inputSchema: z.object({
                contactName: z.string().describe("Contact name"),
                subject: z.string().describe("Email subject"),
                body: z.string().describe("Email body"),
            }),
            execute: async ({ contactName, subject, body }) =>
                runSendEmail(workspaceId, { contactName, subject, body, enforceCustomerContactMode: true }),
        }),
        makeCall: tool({
            description: "Initiate an outbound phone call via Tracey for users. Customer-contact mode applies: execute may place the call, review & approve drafts the action, info only blocks it.",
            inputSchema: z.object({
                contactName: z.string().describe("Contact name"),
                purpose: z.string().optional().describe("Brief call purpose"),
            }),
            execute: async ({ contactName, purpose }) =>
                runMakeCall(workspaceId, { contactName, purpose, enforceCustomerContactMode: true }),
        }),
        getConversationHistory: tool({
            description: "Get text/call/email history with a specific contact.",
            inputSchema: z.object({
                contactName: z.string().describe("Contact name"),
                limit: z.number().optional().describe("Max items to return (default 20)"),
            }),
            execute: async ({ contactName, limit }) =>
                runGetConversationHistory(workspaceId, { contactName, limit }),
        }),
        listRecentCrmChanges: tool({
            description: "List the most recent CRM changes and assistant actions.",
            inputSchema: z.object({
                limit: z.number().optional().describe("Max changes to list (default 10)"),
            }),
            execute: async ({ limit }) => runListRecentCrmChanges(workspaceId, limit),
        }),
        createNotification: tool({
            description: "Create a scheduled notification or reminder alert.",
            inputSchema: z.object({
                title: z.string().describe("Notification title"),
                message: z.string().describe("Notification details"),
                scheduledAtISO: z.string().optional().describe("ISO date to trigger. Omit for immediate."),
                link: z.string().optional().describe("URL to open when clicked"),
            }),
            execute: async (params) =>
                runCreateScheduledNotification(workspaceId, params),
        }),
        undoLastAction: tool({
            description: "Undo the most recent action (deal creation, stage move, etc.).",
            inputSchema: z.object({}),
            execute: async () => runUndoLastAction(workspaceId),
        }),
        revertDealStageMove: tool({
            description: "Revert a recorded stage move for a specific deal by explicit deal ID.",
            inputSchema: z.object({
                dealId: z.string().describe("Deal ID"),
            }),
            execute: async ({ dealId }) => runRevertDealStageMove(workspaceId, { dealId }),
        }),
        unassignDeal: tool({
            description: "Remove the current team-member assignment from a specific deal by explicit deal ID.",
            inputSchema: z.object({
                dealId: z.string().describe("Deal ID"),
            }),
            execute: async ({ dealId }) => runUnassignDeal(workspaceId, { dealId }),
        }),
        restoreDeal: tool({
            description: "Restore a deal from lost, deleted, or archived back to its prior active stage.",
            inputSchema: z.object({
                dealId: z.string().describe("Deal ID"),
            }),
            execute: async ({ dealId }) => runRestoreDeal(workspaceId, { dealId }),
        }),
        assignTeamMember: tool({
            description: "Assign a team member to a job. Fuzzy-matches job title and member name.",
            inputSchema: z.object({
                dealTitle: z.string().describe("Job/deal title"),
                teamMemberName: z.string().describe("Team member name or email"),
            }),
            execute: async ({ dealTitle, teamMemberName }) =>
                runAssignTeamMember(workspaceId, { dealTitle, teamMemberName }),
        }),
        contactSupport: tool({
            description: "Create a support ticket for user issues or help requests.",
            inputSchema: z.object({
                message: z.string().describe("Support request description"),
            }),
            execute: async ({ message }) => {
                let activeUserId = userId;
                if (!activeUserId) {
                    const { getAuthUserId } = await import("@/lib/auth");
                    activeUserId = (await getAuthUserId()) ?? undefined;
                }
                if (!activeUserId) return "Unable to identify user for support request.";
                return handleSupportRequest(message, activeUserId, workspaceId);
            },
        }),
        appendTicketNote: tool({
            description: "Append details to an existing support ticket.",
            inputSchema: z.object({
                ticketId: z.string().describe("Support ticket ID"),
                noteContent: z.string().describe("Details to append"),
            }),
            execute: async ({ ticketId, noteContent }) =>
                runAppendTicketNote({ ticketId, noteContent }),
        }),

        addAgentFlag: tool({
            description: "Add a private triage flag to a deal for owner review. Use for concerns that don't match No-Go rules.",
            inputSchema: z.object({
                dealTitle: z.string().describe("Deal title to flag"),
                flag: z.string().describe("Short warning note"),
            }),
            execute: async ({ dealTitle, flag }) =>
                runAddAgentFlag(workspaceId, { dealTitle, flag }),
        }),

        // ─── Just-in-Time Retrieval Tools ──────────────────────
        getSchedule: tool({
            description: "Fetch jobs for a date range. Use for schedule questions and to check conflicts before new jobs.",
            inputSchema: z.object({
                startDate: z.string().describe("Range start (ISO string)"),
                endDate: z.string().describe("Range end (ISO string)"),
            }),
            execute: async ({ startDate, endDate }) =>
                runGetSchedule(workspaceId, { startDate, endDate }),
        }),
        searchJobHistory: tool({
            description: "Search past jobs by keyword (client name, address, description).",
            inputSchema: z.object({
                query: z.string().describe("Search keywords"),
                limit: z.number().optional().describe("Max results (default 5)"),
            }),
            execute: async ({ query, limit }) =>
                runSearchJobHistory(workspaceId, { query, limit }),
        }),
        getFinancialReport: tool({
            description: "Revenue, job counts, and completion rates for a date range.",
            inputSchema: z.object({
                startDate: z.string().describe("Range start (ISO string)"),
                endDate: z.string().describe("Range end (ISO string)"),
            }),
            execute: async ({ startDate, endDate }) =>
                runGetFinancialReport(workspaceId, { startDate, endDate }),
        }),
        showConfirmationCard: tool({
            description: "Show Confirm/Cancel button for a data change. Pass a short summary.",
            inputSchema: z.object({
                summary: z.string().describe("Short change summary"),
            }),
            execute: async ({ summary }) => ({ showConfirmButton: true, summary }),
        }),
        recordManualRevenue: tool({
            description: "Record revenue for a period. Call ONLY after user confirms.",
            inputSchema: z.object({
                amount: z.number().describe("Revenue amount in dollars"),
                startDate: z.string().describe("Period start (ISO string)"),
                endDate: z.string().describe("Period end (ISO string)"),
            }),
            execute: async ({ amount, startDate, endDate }) =>
                recordManualRevenue(workspaceId, { amount, startDate, endDate }),
        }),
        getClientContext: tool({
            description: "Full client profile: contact info, recent jobs, notes, messages.",
            inputSchema: z.object({
                clientName: z.string().describe("Client name (fuzzy matched)"),
            }),
            execute: async ({ clientName }) =>
                runGetClientContext(workspaceId, { clientName }),
        }),
        getTodaySummary: tool({
            description: "Today's jobs with readiness checks (missing address/phone, unassigned, etc.). Lead with alerts.",
            inputSchema: z.object({}),
            execute: async () => runGetTodaySummary(workspaceId),
        }),
        getAvailability: tool({
            description: "Check available time slots on a specific date.",
            inputSchema: z.object({
                date: z.string().describe("Target date (ISO string)"),
            }),
            execute: async ({ date }) =>
                runGetAvailability(workspaceId, {
                    date,
                    workingHoursStart: settings?.workingHoursStart || "08:00",
                    workingHoursEnd: settings?.workingHoursEnd || "17:00",
                    workspaceTimezone: settings?.workspaceTimezone || "Australia/Sydney",
                    weeklyHours: settings?.weeklyHours,
                }),
        }),

        // ─── Pricing Tools (Source of Truth) ─────────────────────
        pricingLookup: tool({
            description: "Look up approved pricing for a service or task. MUST be called before quoting ANY price. Returns explicitly sourced pricing from glossary, service rules, and historical jobs. Never quote a price without calling this first.",
            inputSchema: z.object({
                query: z.string().describe("Service or task to look up pricing for (e.g. 'sink repair', 'light install', 'blocked drain')"),
            }),
            execute: async ({ query }) => runPricingLookup(workspaceId, { query }),
        }),
        pricingCalculator: tool({
            description: "Deterministic calculator for ALL pricing math. You MUST use this for any arithmetic involving dollar amounts — additions, totals, tax, discounts, margins, or multi-item quotes. NEVER perform pricing calculations yourself.",
            inputSchema: z.object({
                operation: z.enum(["add", "subtract", "multiply", "divide", "percentage", "quote_total", "discount", "tax", "margin"])
                    .describe("The calculation to perform"),
                a: z.number().describe("Primary value (e.g. base price, subtotal, cost)"),
                b: z.number().optional().describe("Secondary value (e.g. quantity, tax rate %, discount %). For tax: defaults to 10% GST if omitted."),
                lineItems: z.array(z.object({
                    description: z.string().describe("Line item name"),
                    unitPrice: z.number().describe("Price per unit"),
                    quantity: z.number().describe("Quantity"),
                })).optional().describe("For quote_total: list of line items. 'a' becomes call-out fee (0 if none), 'b' becomes tax rate."),
            }),
            execute: async (params) => calculate(params),
        }),
    };
}

// Tools that are always included regardless of intent classification
const CORE_TOOLS = [
    'listDeals', 'getAttentionRequired', 'searchContacts', 'contactSupport', 'showConfirmationCard',
    'showJobDraftForConfirmation', 'updateAiPreferences', 'addAgentFlag',
    'undoLastAction',
];

// Intent-specific tool groups that supplement core tools
const INTENT_TOOL_GROUPS: Record<string, string[]> = {
    pricing: ['pricingLookup', 'pricingCalculator', 'createDraftInvoice', 'updateInvoiceAmount'],
    scheduling: ['getSchedule', 'getAvailability', 'createJobNatural', 'proposeReschedule', 'getTodaySummary'],
    communication: ['sendSms', 'sendEmail', 'makeCall', 'getConversationHistory', 'createNotification'],
    reporting: ['getFinancialReport', 'getTodaySummary', 'searchJobHistory', 'recordManualRevenue', 'getAttentionRequired'],
    contact_lookup: ['getClientContext', 'createContact', 'updateContactFields'],
    invoice: [
        'createDraftInvoice', 'issueInvoice', 'markInvoicePaid', 'voidInvoice',
        'reverseInvoiceStatus', 'updateInvoiceFields', 'updateInvoiceAmount',
        'sendInvoiceReminder', 'getInvoiceStatus', 'pricingLookup', 'pricingCalculator',
    ],
    support: ['appendTicketNote'],
    flow_control: [], // Minimal tools for "ok", "yes", "next", etc.
};

/**
 * Returns a subset of agent tools relevant to the detected intent.
 * Falls back to the full tool set for "general" intent or low-confidence classifications.
 */
export function getAgentToolsForIntent(
    workspaceId: string,
    settings: AgentToolSettings | null | undefined,
    userId: string | undefined,
    classification: PreClassification,
) {
    const allTools = getAgentTools(workspaceId, settings, userId);

    // Low confidence or general intent: send all tools
    if (classification.intent === 'general' || classification.confidence < 0.5) {
        return allTools;
    }

    const intentTools = INTENT_TOOL_GROUPS[classification.intent] ?? [];
    const relevant = new Set([...CORE_TOOLS, ...intentTools, ...classification.suggestedTools]);
    return Object.fromEntries(
        Object.entries(allTools).filter(([k]) => relevant.has(k))
    ) as typeof allTools;
}
