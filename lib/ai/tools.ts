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
            description:
                "List all deals/jobs in the pipeline. Use when the user asks to see deals, pipeline, jobs, or what they have. Returns id, title, stage, value for each deal.",
            inputSchema: z.object({}),
            execute: async () => runListDeals(workspaceId),
        }),
        moveDeal: tool({
            description:
                "Move a deal to a different stage. Use deal title (from listDeals if unsure) and target stage: completed, quoted, scheduled, in progress, new request, pipeline, ready to invoice, deleted.",
            inputSchema: z.object({
                dealTitle: z.string().describe("Name/title of the deal or job to move"),
                newStage: z.string().describe("Target stage name"),
            }),
            execute: async ({ dealTitle, newStage }) =>
                runMoveDeal(workspaceId, dealTitle.trim(), newStage.trim()),
        }),
        createDeal: tool({
            description:
                "Create a new deal. Requires title; optional company/client name and value (number).",
            inputSchema: z.object({
                title: z.string().describe("Deal or job title"),
                company: z.string().optional().describe("Client or company name"),
                value: z.number().optional().describe("Deal value in dollars"),
            }),
            execute: async ({ title, company, value }) =>
                runCreateDeal(workspaceId, { title, company, value }),
        }),
        createJobNatural: tool({
            description:
                "Create a job from a one-liner: extract clientName, workDescription, price; optional address, schedule, phone, email. REQUIRED when the user pastes a single message describing a job (person + work + optional address/time/price/phone). Always extract the client's phone number if included. Always pass schedule when a date or time is mentioned so the job goes to the Scheduled column.",
            inputSchema: z.object({
                clientName: z.string().describe("Client full name (first and last)"),
                workDescription: z.string().describe("What work is needed"),
                price: z.number().describe("Price in dollars"),
                address: z.string().optional().describe("Street address for the job"),
                schedule: z.string().optional().describe("When e.g. tomorrow 2pm"),
                phone: z.string().optional().describe("Client phone number if provided (e.g. 0434955958 or +61434955958)"),
                email: z.string().optional().describe("Client email if provided"),
            }),
            execute: async (params) => runCreateJobNatural(workspaceId, params),
        }),
        showJobDraftForConfirmation: tool({
            description:
                "REQUIRED when showing any job in a multi-job flow. Shows a draft CARD with Confirm/Cancel buttons — the user must see this card, not a text description. When the user says 'Next' or you are showing the 2nd, 3rd, etc. job from their list: call this tool with that job's clientName, workDescription, price, address, schedule, phone, email (extract from the user's original message). Do NOT reply with bullet points like '* Client: X * Work: Y' — that is wrong. Always call this tool so the UI displays the draft card. After the user confirms the card, they will send 'Next' and you call this tool again for the next job.",
            inputSchema: z.object({
                clientName: z.string().describe("Client full name (first and last)"),
                workDescription: z.string().describe("What work is needed"),
                price: z.number().describe("Price in dollars"),
                address: z.string().optional().describe("Street address for the job"),
                schedule: z.string().optional().describe("When e.g. tomorrow 2pm"),
                phone: z.string().optional().describe("Client phone number if provided"),
                email: z.string().optional().describe("Client email if provided"),
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
            description:
                "Propose a new time for an existing job. Use when the user says to propose a different time (e.g. after a clash warning, or 'let's schedule at 3pm instead'). Logs the proposed time, adds a note, and creates a task to contact the customer to confirm.",
            inputSchema: z.object({
                dealTitle: z.string().describe("Job/deal title (e.g. Plumbing Replacement, or the client/job name)"),
                proposedSchedule: z.string().describe("The new proposed time, e.g. tomorrow 3pm, Tuesday 10am"),
            }),
            execute: async ({ dealTitle, proposedSchedule }) =>
                runProposeReschedule(workspaceId, { dealTitle, proposedSchedule }),
        }),
        updateInvoiceAmount: tool({
            description: "Update the final invoiced amount for a job. Use this when the user mentions invoicing a job or changing the invoice amount.",
            inputSchema: z.object({
                dealTitle: z.string().describe("Job/deal title to invoice"),
                amount: z.number().describe("The final invoiced amount as a number"),
            }),
            execute: async ({ dealTitle, amount }) =>
                runUpdateInvoiceAmount(workspaceId, { dealTitle, amount }),
        }),
        updateAiPreferences: tool({
            description: "Use this when the user gives you a permanent instruction about how you should behave, quote, or schedule in the future (e.g., 'From now on, always add a 1 hour buffer', 'Remember I dont work past 3pm on Fridays').",
            inputSchema: z.object({
                rule: z.string().describe("The specific behavioral rule to save permanently in your memory bank."),
            }),
            execute: async ({ rule }) => runUpdateAiPreferences(workspaceId, rule),
        }),
        logActivity: tool({
            description: "Record a call, meeting, note, or email explicitly. Use when the user says 'Log a call with John' or 'Note down that the pipe was broken'.",
            inputSchema: z.object({
                type: z.enum(["CALL", "EMAIL", "NOTE", "MEETING", "TASK"]).describe("The type of activity to record"),
                content: z.string().describe("What happened or what the note is about"),
            }),
            execute: async ({ type, content }) => runLogActivity({ type, content }),
        }),
        createTask: tool({
            description: "Create a reminder or to-do task. Use when the user says 'Remind me tomorrow to order pipes' or 'Task: check up on Mary'.",
            inputSchema: z.object({
                title: z.string().describe("The name or title of the task"),
                dueAtISO: z.string().optional().describe("ISO date string for when the task is due. Default is tomorrow 9am if omitted."),
                description: z.string().optional().describe("Optional extra details about the task"),
            }),
            execute: async (params) => runCreateTask(params),
        }),
        searchContacts: tool({
            description: "Look up people or companies in the database CRM. Use when the user asks 'Find John Doe' or 'Search my contacts for Acme Corp'.",
            inputSchema: z.object({
                query: z.string().describe("The name or keyword to search for"),
            }),
            execute: async ({ query }) => runSearchContacts(workspaceId, query),
        }),
        createContact: tool({
            description: "Add a new person or company to the database CRM explicitly.",
            inputSchema: z.object({
                name: z.string().describe("The contact's full name or company name"),
                email: z.string().optional().describe("The contact's email address"),
                phone: z.string().optional().describe("The contact's phone number"),
            }),
            execute: async (params) => runCreateContact(workspaceId, params),
        }),
        sendSms: tool({
            description: "Send an SMS text message to a contact. Use when the user says 'Text Steven I'm on my way' or 'Send a message to Mary saying we'll be there at 3pm'. Finds the contact by name and sends via their phone number.",
            inputSchema: z.object({
                contactName: z.string().describe("Name of the contact to text"),
                message: z.string().describe("The SMS message to send"),
            }),
            execute: async ({ contactName, message }) =>
                runSendSms(workspaceId, { contactName, message }),
        }),
        sendEmail: tool({
            description: "Send an email to a contact. Use when the user says 'Email Mary the quote' or 'Send John an email confirming his appointment'. Finds the contact by name and uses their email address.",
            inputSchema: z.object({
                contactName: z.string().describe("Name of the contact to email"),
                subject: z.string().describe("Email subject line"),
                body: z.string().describe("Email body content"),
            }),
            execute: async ({ contactName, subject, body }) =>
                runSendEmail(workspaceId, { contactName, subject, body }),
        }),
        makeCall: tool({
            description: "Initiate an outbound phone call to a contact via the AI voice agent (Retell AI). Use when the user says 'Call John', 'Ring Mary about the quote', or 'Phone Steven to confirm'. The AI voice agent will handle the conversation.",
            inputSchema: z.object({
                contactName: z.string().describe("Name of the contact to call"),
                purpose: z.string().optional().describe("Brief purpose of the call, e.g. 'confirm appointment for Thursday' or 'follow up on quote'"),
            }),
            execute: async ({ contactName, purpose }) =>
                runMakeCall(workspaceId, { contactName, purpose }),
        }),
        getConversationHistory: tool({
            description: "Retrieve text/call/email history with a specific contact. Use when the user asks 'Show me my texts with Steven' or 'What's my history with Mary?' or 'Show me my conversation with John'.",
            inputSchema: z.object({
                contactName: z.string().describe("Name of the contact to look up history for"),
                limit: z.number().optional().describe("How many recent items to return (default 20)"),
            }),
            execute: async ({ contactName, limit }) =>
                runGetConversationHistory(workspaceId, { contactName, limit }),
        }),
        createNotification: tool({
            description: "Create a scheduled notification or reminder alert. Use when the user says 'Notify me 2 days before Wendy's job' or 'Alert me Friday if John hasn't responded' or 'Remind me to follow up with the plumber'.",
            inputSchema: z.object({
                title: z.string().describe("Short notification title"),
                message: z.string().describe("Notification details/body"),
                scheduledAtISO: z.string().optional().describe("ISO date for when to trigger (e.g. 2026-02-25T09:00:00). Omit for immediate."),
                link: z.string().optional().describe("Optional URL to navigate to when clicked"),
            }),
            execute: async (params) =>
                runCreateScheduledNotification(workspaceId, params),
        }),
        undoLastAction: tool({
            description: "Undo the most recent action. Use when the user says 'Undo that', 'Revert', 'Take that back', or 'Oops undo'. Reverses the last deal creation, stage move, or other reversible action.",
            inputSchema: z.object({}),
            execute: async () => runUndoLastAction(workspaceId),
        }),
        assignTeamMember: tool({
            description: "Assign a team member to a job/deal. Use when the user says 'Assign Dave to the Henderson job', 'Put Sarah on the plumbing repair', or 'Give the roof job to Mike'. Fuzzy-matches both the job title and team member name.",
            inputSchema: z.object({
                dealTitle: z.string().describe("The job/deal title or description to assign"),
                teamMemberName: z.string().describe("The team member's name (or email) to assign the job to"),
            }),
            execute: async ({ dealTitle, teamMemberName }) =>
                runAssignTeamMember(workspaceId, { dealTitle, teamMemberName }),
        }),
        contactSupport: tool({
            description: "Create a support ticket when the user asks for help, reports issues, or needs assistance. Use for phrases like 'I need help', 'support', 'contact support', 'something is broken', 'phone number not working', 'billing issue', etc. Automatically categorizes and prioritizes the request.",
            inputSchema: z.object({
                message: z.string().describe("The user's support request or issue description"),
            }),
            execute: async ({ message }) => {
                // Note: Since auth may run in a webhook context, passing userId is safer than
                // relying purely on Next.js headers/cookies when not available.
                let activeUserId = userId;
                if (!activeUserId) {
                    const { getAuthUserId } = await import("@/lib/auth");
                    activeUserId = await getAuthUserId();
                }
                if (!activeUserId) return "Unable to identify user for support request.";
                return handleSupportRequest(message, activeUserId, workspaceId);
            },
        }),
        appendTicketNote: tool({
            description: "Appends details to an existing ticket. Use this ONLY when the user adds information immediately after a ticket creation event.",
            inputSchema: z.object({
                ticketId: z.string().describe("Existing support ticket ID"),
                noteContent: z.string().describe("Additional details to append to the ticket"),
            }),
            execute: async ({ ticketId, noteContent }) =>
                runAppendTicketNote({ ticketId, noteContent }),
        }),

        // ─── Phase 2: Just-in-Time Retrieval Tools ──────────────────────
        getSchedule: tool({
            description: "Fetches scheduled jobs for a specific date range. Use this when the user asks 'What am I doing next week?', 'Do I have space on Tuesday?', 'What's my schedule for March?', or any question about upcoming or past appointments. Also use before scheduling new jobs to check for conflicts and nearby jobs for smart geolocation routing.",
            inputSchema: z.object({
                startDate: z.string().describe("Start of date range as ISO string (e.g. 2026-02-21T00:00:00)"),
                endDate: z.string().describe("End of date range as ISO string (e.g. 2026-02-28T23:59:59)"),
            }),
            execute: async ({ startDate, endDate }) =>
                runGetSchedule(workspaceId, { startDate, endDate }),
        }),
        searchJobHistory: tool({
            description: "Searches for past jobs (completed, cancelled, or any status) based on keywords. Use for queries like 'When was the last time I visited Mrs. Jones?', 'Jobs at 10 Henderson St', 'Have I done work for Acme Corp before?', or any question about past job history.",
            inputSchema: z.object({
                query: z.string().describe("Search keywords — client name, address, or job description"),
                limit: z.number().optional().describe("Max results to return (default 5)"),
            }),
            execute: async ({ query, limit }) =>
                runSearchJobHistory(workspaceId, { query, limit }),
        }),
        getFinancialReport: tool({
            description: "Calculates revenue, job count, and completion rates for a date range. Use when the user asks 'How much did I earn this month?', 'What's my revenue for February?', 'How many jobs did I complete last quarter?', or any financial/performance question.",
            inputSchema: z.object({
                startDate: z.string().describe("Start of date range as ISO string"),
                endDate: z.string().describe("End of date range as ISO string"),
            }),
            execute: async ({ startDate, endDate }) =>
                runGetFinancialReport(workspaceId, { startDate, endDate }),
        }),
        showConfirmationCard: tool({
            description: "Show a Confirm button so the user can approve a data change (e.g. update revenue). Call this when you offer to update data and want the user to confirm. Pass a short summary of what will change.",
            inputSchema: z.object({
                summary: z.string().describe("Short summary of the change, e.g. 'Update February revenue to $200'"),
            }),
            execute: async ({ summary }) => ({ showConfirmButton: true, summary }),
        }),
        recordManualRevenue: tool({
            description: "Record manual revenue for a period. Call ONLY after the user has confirmed (typed 'confirm', 'ok', 'agree', 'yes', or clicked Confirm). Use the amount and date range the user originally gave.",
            inputSchema: z.object({
                amount: z.number().describe("Revenue amount in dollars"),
                startDate: z.string().describe("Start of period as ISO string (e.g. 2026-02-01T00:00:00)"),
                endDate: z.string().describe("End of period as ISO string (e.g. 2026-02-28T23:59:59)"),
            }),
            execute: async ({ amount, startDate, endDate }) =>
                recordManualRevenue(workspaceId, { amount, startDate, endDate }),
        }),
        getClientContext: tool({
            description: "Fetches a complete profile for a specific client: their contact info, recent jobs, notes, and message history. Use when the user asks 'Tell me about Mrs. Jones', 'What's the history with John Smith?', 'Pull up Steven's details', or needs context about a client before a call/visit.",
            inputSchema: z.object({
                clientName: z.string().describe("The client name to look up (fuzzy matched)"),
            }),
            execute: async ({ clientName }) =>
                runGetClientContext(workspaceId, { clientName }),
        }),
        getTodaySummary: tool({
            description: "Quick snapshot of today's scheduled jobs, overdue tasks, and recent message count. Use for 'What's on today?', 'Give me my daily summary', 'Morning brief', or when the user opens the chat without a specific question.",
            inputSchema: z.object({}),
            execute: async () => runGetTodaySummary(workspaceId),
        }),
        getAvailability: tool({
            description: "Check available time slots on a specific date given existing scheduled jobs and working hours. Use for 'Am I free on Tuesday?', 'What slots are open next Monday?', 'When can I fit in a job this week?'.",
            inputSchema: z.object({
                date: z.string().describe("The target date as ISO string (e.g. 2026-02-25)"),
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
