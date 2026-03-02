import { tool } from "ai";
import { z } from "zod";
import {
    runMoveDeal,
    runListDeals,
    runCreateDeal,
    runCreateJobNatural,
    runProposeReschedule,
    runUpdateInvoiceAmount,
    runUpdateAiPreferences,
    runLogActivity,
    runCreateTask,
    runSearchContacts,
    runCreateContact,
    runSendSms,
    runSendEmail,
    runMakeCall,
    runGetConversationHistory,
    runCreateScheduledNotification,
    runUndoLastAction,
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
import { buildJobDraftFromParams } from "@/lib/chat-utils";

/**
 * Returns the record of tool definitions for the AI agent to use, bound to a specific workspace and settings.
 *
 * @param workspaceId - The ID of the workspace.
 * @param settings - The workspace settings, used for availability mapping.
 * @param userId - Optional user ID for operations requiring it (e.g., support requests).
 */
export function getAgentTools(workspaceId: string, settings: any, userId?: string) {
    return {
        listDeals: tool({
            description: "List all jobs in the pipeline (id, title, stage, value).",
            inputSchema: z.object({}),
            execute: async () => runListDeals(workspaceId),
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
        updateAiPreferences: tool({
            description: "Save a permanent behavioral rule. Prefix [HARD_CONSTRAINT] to strictly decline or [FLAG_ONLY] to just flag.",
            inputSchema: z.object({
                rule: z.string().describe("The rule to save. Prefix with [HARD_CONSTRAINT] or [FLAG_ONLY]."),
            }),
            execute: async ({ rule }) => runUpdateAiPreferences(workspaceId, rule),
        }),
        logActivity: tool({
            description: "Record a call, meeting, note, or email.",
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
        sendSms: tool({
            description: "Send an SMS to a contact by name. Finds the contact and sends via their phone.",
            inputSchema: z.object({
                contactName: z.string().describe("Contact name"),
                message: z.string().describe("SMS message to send"),
            }),
            execute: async ({ contactName, message }) =>
                runSendSms(workspaceId, { contactName, message }),
        }),
        sendEmail: tool({
            description: "Send an email to a contact by name.",
            inputSchema: z.object({
                contactName: z.string().describe("Contact name"),
                subject: z.string().describe("Email subject"),
                body: z.string().describe("Email body"),
            }),
            execute: async ({ contactName, subject, body }) =>
                runSendEmail(workspaceId, { contactName, subject, body }),
        }),
        makeCall: tool({
            description: "Initiate an outbound phone call via the AI voice agent.",
            inputSchema: z.object({
                contactName: z.string().describe("Contact name"),
                purpose: z.string().optional().describe("Brief call purpose"),
            }),
            execute: async ({ contactName, purpose }) =>
                runMakeCall(workspaceId, { contactName, purpose }),
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
                }),
        }),
    };
}
