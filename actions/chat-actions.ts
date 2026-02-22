"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getDeals, createDeal, updateDealStage, updateDealMetadata } from "./deal-actions";
import { logActivity } from "./activity-actions";
import { createContact, searchContacts } from "./contact-actions";
import { createTask } from "./task-actions";
import { createNotification } from "./notification-actions";
import { generateMorningDigest } from "@/lib/digest";
import { getTemplates, renderTemplate } from "./template-actions";
import { findDuplicateContacts } from "./dedup-actions";
import { generateQuote } from "./tradie-actions";
import { fuzzyScore } from "@/lib/search";
import {
  titleCase,
  categoriseWork,
  resolveSchedule,
  enrichAddress,
  WORK_CATEGORIES,
  STREET_ABBREVS,
  DAY_ABBREVS,
} from "@/lib/chat-utils";

// ─── Stage Alias Mapping ─────────────────────────────────────────────
// Maps any user-facing stage name (industry-specific or generic) to the
// internal lowercase stage key used by the Kanban board and DB.
const STAGE_ALIASES: Record<string, string> = {
  // Internal keys (identity)
  "new": "new",
  "contacted": "contacted",
  "negotiation": "negotiation",
  "won": "won",
  "lost": "lost",
  "invoiced": "invoiced",
  // Generic CRM
  "new lead": "new",
  "lead": "new",
  // Trades
  "new job": "new",
  "new jobs": "new",
  "quoted": "contacted",
  "quote": "contacted",
  "quoting": "contacted",
  "in progress": "negotiation",
  "in-progress": "negotiation",
  "inprogress": "negotiation",
  "progress": "negotiation",
  "completed": "won",
  "complete": "won",
  "done": "won",
  "finished": "won",
  "scheduled": "won",
  // Real Estate
  "new listing": "new",
  "new listings": "new",
  "listing": "new",
  "appraised": "contacted",
  "appraisal": "contacted",
  "under offer": "negotiation",
  "under-offer": "negotiation",
  "offer": "negotiation",
  "settled": "won",
  "settlement": "won",
  "under contract": "won",
  "exchanged": "won",
  "withdrawn": "lost",
  "cancelled": "lost",
  "canceled": "lost",
  // Construction
  "awarded": "won",
  // Paid / Invoice stages
  "paid": "won",
  "invoice": "invoiced",
};

/** Resolve a user-facing stage name to the internal stage key */
function resolveStage(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (STAGE_ALIASES[key]) return STAGE_ALIASES[key];
  // Partial match fallback
  for (const [alias, stage] of Object.entries(STAGE_ALIASES)) {
    if (key.includes(alias) || alias.includes(key)) return stage;
  }
  return null;
}

/** Fuzzy-match a deal title from the deals list */
function findDealByTitle(deals: { id: string; title: string }[], query: string): { id: string; title: string } | null {
  const q = query.toLowerCase().trim();
  // Exact match first
  const exact = deals.find(d => d.title.toLowerCase() === q);
  if (exact) return exact;
  // Contains match
  const contains = deals.find(d => d.title.toLowerCase().includes(q));
  if (contains) return contains;
  // Reverse contains (query contains deal title)
  const reverseContains = deals.find(d => q.includes(d.title.toLowerCase()));
  if (reverseContains) return reverseContains;
  // Fuzzy match
  let bestDeal: { id: string; title: string } | null = null;
  let bestScore = 0;
  for (const deal of deals) {
    const score = fuzzyScore(q, deal.title.toLowerCase());
    if (score > bestScore && score >= 0.5) {
      bestScore = score;
      bestDeal = deal;
    }
  }
  return bestDeal;
}

export interface IndustryContext {
  dealLabel: string;
  dealsLabel: string;
  contactLabel: string;
  stageLabels: Record<string, string>;
  helpExtras: string;
  greeting: string;
  unknownFallback: string;
}

/**
 * Get industry-specific context for chat responses.
 */
function getIndustryContext(industryType: string | null): IndustryContext {
  switch (industryType) {
    case "REAL_ESTATE":
      return {
        dealLabel: "listing",
        dealsLabel: "listings",
        contactLabel: "buyer",
        stageLabels: {
          NEW: "New",
          CONTACTED: "Contacted",
          NEGOTIATION: "Under Offer",
          WON: "Under Contract",
          LOST: "Lost"
        },
        helpExtras: "\n  \"Start open house\" — Begin kiosk mode",
        greeting: "Hi! I'm your real estate assistant. How can I help you today?",
        unknownFallback: "I'm not sure how to help with that. Try asking about listings, buyers, or scheduling."
      };
    case "CONSTRUCTION":
      return {
        dealLabel: "project",
        dealsLabel: "projects",
        contactLabel: "client",
        stageLabels: {
          NEW: "Lead",
          CONTACTED: "Quoting",
          NEGOTIATION: "Negotiation",
          WON: "Awarded",
          LOST: "Lost"
        },
        helpExtras: "\n  \"Site check\" — Complete safety checklist",
        greeting: "Hi! I'm your construction assistant. What can I help you with today?",
        unknownFallback: "I'm not sure how to help with that. Try asking about projects, clients, or site checks."
      };
    default: // TRADES
      return {
        dealLabel: "job",
        dealsLabel: "jobs",
        contactLabel: "client",
        stageLabels: {
          NEW: "Lead",
          CONTACTED: "Quoting",
          NEGOTIATION: "Negotiation",
          WON: "Scheduled",
          LOST: "Lost"
        },
        helpExtras: "\n  \"On my way\" — Notify client you're traveling",
        greeting: "Hi! I'm your trades assistant. How can I help you today?",
        unknownFallback: "I'm not sure how to help with that. Try asking about jobs, clients, or scheduling."
      };
  }
}

/**
 * Execute "move deal" by title and stage alias. Used by the AI chat route tool.
 * Returns a short message for the assistant to confirm to the user.
 */
export async function runMoveDeal(
  workspaceId: string,
  dealTitle: string,
  stageAlias: string
): Promise<{ success: boolean; message: string; dealId?: string; stage?: string }> {
  const deals = await getDeals(workspaceId);
  const deal = findDealByTitle(deals, dealTitle);
  if (!deal) {
    const suggestions = deals.slice(0, 5).map(d => `"${d.title}"`).join(", ");
    return {
      success: false,
      message: `Couldn't find a deal matching "${dealTitle}".${deals.length > 0 ? ` Current deals: ${suggestions}` : " No deals yet."}`,
    };
  }
  const resolvedStage = resolveStage(stageAlias);
  if (!resolvedStage) {
    const validStages = Object.keys(STAGE_ALIASES).filter(k => k.length > 3).slice(0, 10).join(", ");
    return { success: false, message: `Unknown stage "${stageAlias}". Try: ${validStages}` };
  }
  const result = await updateDealStage(deal.id, resolvedStage);
  if (!result.success) {
    return { success: false, message: result.error ?? "Failed to move deal." };
  }
  let industryType: string | null = null;
  try {
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { industryType: true },
    });
    industryType = workspace?.industryType ?? null;
  } catch {
    // ignore
  }
  const ctx = getIndustryContext(industryType);
  const stageLabel = ctx.stageLabels[resolvedStage.toUpperCase() as keyof typeof ctx.stageLabels] ?? resolvedStage;
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/deals");
  return {
    success: true,
    message: `Moved "${deal.title}" to ${stageLabel}.`,
    dealId: deal.id,
  };
}

/**
 * Propose a new time for a job: log it on the deal, log activity, and create a follow-up task to confirm with the customer.
 * Use when the user says e.g. "let's propose 3pm instead" or "propose scheduling at Y time" for a specific job.
 */
export async function runProposeReschedule(
  workspaceId: string,
  params: { dealTitle: string; proposedSchedule: string }
): Promise<{ success: boolean; message: string }> {
  const deals = await getDeals(workspaceId);
  const deal = findDealByTitle(deals, params.dealTitle.trim());
  if (!deal) {
    const suggestions = deals.slice(0, 5).map((d) => `"${d.title}"`).join(", ");
    return {
      success: false,
      message: `Couldn't find a job matching "${params.dealTitle}".${deals.length > 0 ? ` Current jobs: ${suggestions}` : " No jobs yet."}`,
    };
  }
  let display: string;
  let iso: string;
  try {
    const resolved = resolveSchedule(params.proposedSchedule.trim());
    display = resolved.display;
    iso = resolved.iso;
  } catch {
    display = params.proposedSchedule.trim();
    iso = "";
  }
  const metaResult = await updateDealMetadata(deal.id, {
    proposedSchedule: iso,
    proposedScheduleDisplay: display,
  });
  if (!metaResult.success) {
    return { success: false, message: metaResult.error ?? "Failed to save proposed time." };
  }
  const fullDeal = await db.deal.findUnique({
    where: { id: deal.id },
    include: { contact: true },
  });
  const contactName = fullDeal?.contact?.name ?? "customer";
  const contactId = fullDeal?.contactId ?? undefined;
  await logActivity({
    type: "NOTE",
    title: "Proposed reschedule",
    content: `Proposed new time: ${display}. Reach out to customer to lock it down.`,
    dealId: deal.id,
    contactId: contactId ?? undefined,
  });
  const tomorrow9am = new Date();
  tomorrow9am.setDate(tomorrow9am.getDate() + 1);
  tomorrow9am.setHours(9, 0, 0, 0);
  await createTask({
    title: `Confirm new time with ${contactName}`,
    description: `Proposed: ${display}. Contact them to confirm the new time.`,
    dueAt: tomorrow9am,
    dealId: deal.id,
    contactId: contactId ?? undefined,
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/deals");
  return {
    success: true,
    message: `Proposed ${display} for "${deal.title}". I’ve logged it and added a task to confirm with ${contactName} (due tomorrow 9am).`,
  };
}

/**
 * List deals for the LLM (title, stage, value). Used by the chat listDeals tool.
 */
export async function runListDeals(workspaceId: string): Promise<{ deals: { id: string; title: string; stage: string; value: number }[] }> {
  const deals = await getDeals(workspaceId);
  return {
    deals: deals.map((d) => ({
      id: d.id,
      title: d.title,
      stage: d.stage,
      value: d.value,
    })),
  };
}

/**
 * Create a deal by title and optional company/value. Finds or creates contact. Used by chat createDeal tool.
 */
export async function runCreateDeal(
  workspaceId: string,
  params: { title: string; company?: string; value?: number }
): Promise<{ success: boolean; message: string; dealId?: string }> {
  let contactId: string | undefined;
  const company = (params.company ?? params.title).trim() || "Unknown";
  const contacts = await searchContacts(workspaceId, company);
  contactId = contacts[0]?.id;
  if (!contactId) {
    const result = await createContact({ name: company, workspaceId });
    if (result.success) contactId = result.contactId;
  }
  if (!contactId) {
    return { success: false, message: "Could not find or create a contact for this deal." };
  }
  const result = await createDeal({
    title: params.title.trim(),
    company,
    value: params.value ?? 0,
    stage: "new",
    contactId,
    workspaceId,
  });
  if (!result.success) {
    return { success: false, message: result.error ?? "Failed to create deal." };
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/deals");
  return {
    success: true,
    message: `Created deal "${params.title}"${params.value != null && params.value > 0 ? ` worth $${params.value.toLocaleString()}` : ""}.`,
    dealId: result.dealId,
  };
}

/**
 * Create a job from natural language (client, address, work, price, schedule). Used by chat createJobNatural tool.
 */
export async function runCreateJobNatural(
  workspaceId: string,
  params: {
    clientName: string;
    address?: string;
    workDescription: string;
    price: number;
    schedule?: string;
    phone?: string;
    email?: string;
    contactType?: "PERSON" | "BUSINESS";
  }
): Promise<{ success: boolean; message: string; dealId?: string }> {
  const clientName = params.clientName?.trim() || "Unknown";
  const contactResult = await createContact({
    name: clientName,
    workspaceId,
    phone: params.phone?.trim() || undefined,
    email: params.email?.trim() || undefined,
    contactType: params.contactType ?? "PERSON",
  });
  if (!contactResult.success) {
    return { success: false, message: `Failed to create contact: ${contactResult.error}` };
  }
  const hasSchedule = Boolean(params.schedule?.trim());
  let scheduledAt: Date | undefined;
  let scheduleDisplay = params.schedule ?? "";
  if (hasSchedule) {
    try {
      const resolved = resolveSchedule(params.schedule!.trim());
      scheduledAt = new Date(resolved.iso);
      scheduleDisplay = resolved.display;
    } catch {
      scheduleDisplay = params.schedule!;
    }
  }
  const dealResult = await createDeal({
    title: params.workDescription.trim() || "Job",
    company: clientName,
    value: params.price ?? 0,
    stage: hasSchedule ? "scheduled" : "new",
    contactId: contactResult.contactId!,
    workspaceId,
    address: params.address?.trim(),
    scheduledAt,
    metadata: {
      address: params.address,
      schedule: params.schedule,
      scheduleDisplay,
      workDescription: params.workDescription,
    },
  });
  if (!dealResult.success) {
    return { success: false, message: dealResult.error ?? "Failed to create job." };
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/deals");
  const scheduleSuffix = scheduleDisplay ? ` Scheduled: ${scheduleDisplay}.` : "";
  return {
    success: true,
    message: `Job created: ${params.workDescription} for ${clientName}, $${(params.price ?? 0).toLocaleString()}.${scheduleSuffix}`,
    dealId: dealResult.dealId,
  };
}

/**
 * Confirm a job draft and create the deal (used when user clicks "Create Job" on the draft card).
 */
export async function confirmJobDraft(
  workspaceId: string,
  draft: {
    clientName: string;
    workDescription: string;
    price: string | number;
    address?: string;
    schedule?: string;
    rawSchedule?: string;
    phone?: string;
    email?: string;
    contactType?: "PERSON" | "BUSINESS";
  }
): Promise<{ success: boolean; message: string; dealId?: string }> {
  const schedule = draft.rawSchedule ?? draft.schedule ?? "";
  const result = await runCreateJobNatural(workspaceId, {
    clientName: draft.clientName.trim(),
    workDescription: draft.workDescription.trim(),
    price: Number(String(draft.price).replace(/,/g, "")) || 0,
    address: draft.address?.trim(),
    schedule: schedule.trim() || undefined,
    phone: draft.phone?.trim(),
    email: draft.email?.trim(),
    contactType: draft.contactType ?? "PERSON",
  });
  return {
    success: result.success,
    message: result.message,
    dealId: result.dealId,
  };
}

/**
 * Save a user chat message (for AI chat route persistence).
 */
export async function saveUserMessage(workspaceId: string, content: string) {
  try {
    await db.chatMessage.create({
      data: { role: "user", content, workspaceId },
    });
  } catch (e) {
    console.error("saveUserMessage:", e);
  }
}

/**
 * Save an assistant chat message (for AI chat route persistence).
 */
export async function saveAssistantMessage(workspaceId: string, content: string) {
  try {
    await db.chatMessage.create({
      data: { role: "assistant", content, workspaceId },
    });
  } catch (e) {
    console.error("saveAssistantMessage:", e);
  }
}


/**
 * Get chat history for a workspace.
 */
export async function getChatHistory(workspaceId: string, limit = 50) {
  try {
    return await db.chatMessage.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  } catch {
    return [];
  }
}

/**
 * Clear chat history for a workspace.
 */
export async function clearChatHistoryAction(workspaceId: string) {
  try {
    await db.chatMessage.deleteMany({
      where: { workspaceId },
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to clear chat history:", error);
    return { success: false };
  }
}

/**
 * AI Tool Action: Update Invoice Amount
 */
export async function runUpdateInvoiceAmount(
  workspaceId: string,
  params: { dealTitle: string; amount: number }
) {
  try {
    const deals = await getDeals(workspaceId);
    const target = findDealByTitle(deals, params.dealTitle);
    if (!target) return `Could not find a job matching "${params.dealTitle}". Try asking for the list of jobs.`;

    const { updateDeal } = await import("./deal-actions");
    await updateDeal(target.id, { invoicedAmount: params.amount });
    return `Successfully updated the invoiced amount for "${target.title}" to $${params.amount}.`;
  } catch (err) {
    return `Error updating invoice amount: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export async function runUpdateAiPreferences(workspaceId: string, rule: string) {
  try {
    const { updateAiPreferences } = await import("./settings-actions");
    await updateAiPreferences(workspaceId, rule);
    return `Successfully saved the rule: "${rule}". I will remember this for future conversations.`;
  } catch (err) {
    return `Error updating preferences: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * AI Tool Action: Log an Activity (Call, Note, etc)
 */
export async function runLogActivity(params: { type: string, content: string, dealId?: string, contactId?: string }) {
  try {
    const result = await logActivity({
      type: params.type.toUpperCase() as any,
      title: `${params.type} logged via Assistant`,
      content: params.content,
      dealId: params.dealId,
      contactId: params.contactId
    });
    if (!result.success) throw new Error(result.error);
    return `Successfully logged ${params.type}: "${params.content}"`;
  } catch (err) {
    return `Error logging activity: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * AI Tool Action: Create a Task/Reminder
 */
export async function runCreateTask(params: { title: string, dueAtISO?: string, description?: string, dealId?: string, contactId?: string }) {
  try {
    // Default due tomorrow 9AM if nothing specified
    let dueAt = new Date();
    dueAt.setDate(dueAt.getDate() + 1);
    dueAt.setHours(9, 0, 0, 0);

    if (params.dueAtISO) {
      dueAt = new Date(params.dueAtISO);
    }

    const result = await createTask({
      title: params.title,
      description: params.description,
      dueAt,
      dealId: params.dealId,
      contactId: params.contactId
    });

    if (!result.success) throw new Error(result.error);
    return `Successfully created task: "${params.title}" due at ${dueAt.toLocaleString()}`;
  } catch (err) {
    return `Error creating task: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * AI Tool Action: Search for Contacts
 */
export async function runSearchContacts(workspaceId: string, query: string) {
  try {
    const contacts = await searchContacts(workspaceId, query);
    if (!contacts.length) return `No contacts found matching "${query}".`;

    return `Found ${contacts.length} matches:\n` + contacts.map(c => `- ${c.name} ${c.company ? `(${c.company})` : ''} ${c.phone ? `Ph: ${c.phone}` : ''}`).join("\n");
  } catch (err) {
    return `Error searching contacts: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * AI Tool Action: Create/Add a Contact
 */
export async function runCreateContact(workspaceId: string, params: { name: string, email?: string, phone?: string }) {
  try {
    const result = await createContact({
      name: params.name,
      email: params.email,
      phone: params.phone,
      workspaceId
    });

    if (!result.success) throw new Error(result.error);
    return `Successfully added contact "${params.name}". ${result.enriched ? "Data was automatically enriched." : ""}`;
  } catch (err) {
    return `Error creating contact: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * AI Tool Action: Send SMS to a contact.
 * Looks up the contact by name, finds or creates a Twilio subaccount client,
 * and sends the message via the workspace's Twilio phone number.
 */
export async function runSendSms(
  workspaceId: string,
  params: { contactName: string; message: string }
): Promise<string> {
  try {
    const contacts = await searchContacts(workspaceId, params.contactName);
    if (!contacts.length) return `No contact found matching "${params.contactName}". Try searching first.`;

    const contact = contacts[0];
    if (!contact.phone) return `Contact "${contact.name}" has no phone number on file. Add one first.`;

    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { twilioPhoneNumber: true, twilioSubaccountId: true, name: true },
    });

    if (!workspace?.twilioPhoneNumber || !workspace.twilioSubaccountId) {
      // Fallback: log as activity instead of sending
      await logActivity({
        type: "NOTE",
        title: `SMS to ${contact.name}`,
        content: `Message: "${params.message}" (Not sent — Twilio not configured for this workspace)`,
        contactId: contact.id,
      });
      await db.chatMessage.create({
        data: {
          role: "assistant",
          content: params.message,
          workspaceId,
          metadata: { contactId: contact.id, channel: "sms", direction: "outbound" },
        },
      });
      return `Logged SMS to ${contact.name} (${contact.phone}): "${params.message}". Note: Twilio is not yet configured so the message was recorded but not delivered.`;
    }

    // Send via Twilio
    const { getSubaccountClient } = await import("@/lib/twilio");
    // Fetch subaccount auth token from env or re-derive from master
    const twilioClient = getSubaccountClient(
      workspace.twilioSubaccountId,
      process.env.TWILIO_SUBACCOUNT_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN || ""
    );
    await twilioClient.messages.create({
      to: contact.phone,
      from: workspace.twilioPhoneNumber,
      body: params.message,
    });

    // Log the outbound message
    await db.chatMessage.create({
      data: {
        role: "assistant",
        content: params.message,
        workspaceId,
        metadata: { contactId: contact.id, channel: "sms", direction: "outbound" },
      },
    });
    await logActivity({
      type: "NOTE",
      title: `SMS sent to ${contact.name}`,
      content: params.message,
      contactId: contact.id,
    });

    return `SMS sent to ${contact.name} (${contact.phone}): "${params.message}"`;
  } catch (err) {
    return `Error sending SMS: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * AI Tool Action: Send an email to a contact via Resend.
 * Looks up the contact by name, sends the email, and logs it as an activity.
 */
export async function runSendEmail(
  workspaceId: string,
  params: { contactName: string; subject: string; body: string }
): Promise<string> {
  try {
    const contacts = await searchContacts(workspaceId, params.contactName);
    if (!contacts.length) return `No contact found matching "${params.contactName}". Try searching first.`;

    const contact = contacts[0];
    if (!contact.email) return `Contact "${contact.name}" has no email address on file. Add one first.`;

    // Look up workspace for sender identity
    const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
    const senderName = workspace?.name ?? "Pj Buddy";

    // Send via Resend if configured
    let delivered = false;
    const resendKey = process.env.RESEND_API_KEY;
    const fromDomain = process.env.RESEND_FROM_DOMAIN;
    if (resendKey && fromDomain) {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      const { error } = await resend.emails.send({
        from: `${senderName} <noreply@${fromDomain}>`,
        to: [contact.email],
        subject: params.subject,
        text: params.body,
      });
      if (error) {
        console.error("[sendEmail] Resend error:", error);
        return `Failed to send email to ${contact.name}: ${error.message}`;
      }
      delivered = true;
    }

    // Log the outbound email as an activity
    await logActivity({
      type: "EMAIL",
      title: `Email to ${contact.name}: ${params.subject}`,
      content: params.body,
      contactId: contact.id,
    });
    await db.chatMessage.create({
      data: {
        role: "assistant",
        content: `Subject: ${params.subject}\n\n${params.body}`,
        workspaceId,
        metadata: { contactId: contact.id, channel: "email", direction: "outbound" },
      },
    });

    if (delivered) {
      return `Email sent to ${contact.name} (${contact.email}). Subject: "${params.subject}".`;
    }
    return `Email logged to ${contact.name} (${contact.email}) but not delivered (Resend not configured). Subject: "${params.subject}".`;
  } catch (err) {
    return `Error sending email: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * AI Tool Action: Initiate an outbound phone call to a contact via Retell AI.
 * Creates a call using the Retell SDK that connects the AI voice agent to the client.
 */
export async function runMakeCall(
  workspaceId: string,
  params: { contactName: string; purpose?: string }
): Promise<string> {
  try {
    const contacts = await searchContacts(workspaceId, params.contactName);
    if (!contacts.length) return `No contact found matching "${params.contactName}". Try searching first.`;

    const contact = contacts[0];
    if (!contact.phone) return `Contact "${contact.name}" has no phone number on file. Add one first.`;

    const retellKey = process.env.RETELL_API_KEY;
    const retellAgentId = process.env.RETELL_AGENT_ID;
    if (!retellKey || !retellAgentId) {
      // Log the intent even if Retell isn't configured
      await logActivity({
        type: "CALL",
        title: `Outbound call attempted to ${contact.name}`,
        content: params.purpose ?? "Call initiated by AI assistant",
        contactId: contact.id,
      });
      return `Call to ${contact.name} (${contact.phone}) logged but not placed (Retell AI not configured). Configure RETELL_API_KEY and RETELL_AGENT_ID.`;
    }

    // Look up the workspace's Twilio number for caller ID
    const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { twilioPhoneNumber: true } });
    const fromNumber = workspace?.twilioPhoneNumber;
    if (!fromNumber) {
      return `No phone number configured for this workspace. Set up a Twilio number in workspace settings first.`;
    }

    // Create the outbound call via Retell
    const Retell = (await import("retell-sdk")).default;
    const retell = new Retell({ apiKey: retellKey });
    const call = await retell.call.createPhoneCall({
      from_number: fromNumber,
      to_number: contact.phone,
      metadata: {
        workspace_id: workspaceId,
        contact_id: contact.id,
        contact_name: contact.name,
        purpose: params.purpose ?? "general",
      },
      override_agent_id: retellAgentId,
    } as any);

    // Log the outbound call as an activity
    await logActivity({
      type: "CALL",
      title: `Outbound call to ${contact.name}`,
      content: params.purpose ?? "Call placed by AI assistant",
      contactId: contact.id,
    });

    return `Call initiated to ${contact.name} (${contact.phone}). The Retell AI agent is now handling the call. Call ID: ${call.call_id}`;
  } catch (err) {
    return `Error making call: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * AI Tool Action: Get conversation history with a contact (SMS, calls, emails).
 * Returns recent ChatMessages and Activities involving this contact.
 */
export async function runGetConversationHistory(
  workspaceId: string,
  params: { contactName: string; limit?: number }
): Promise<string> {
  try {
    const contacts = await searchContacts(workspaceId, params.contactName);
    if (!contacts.length) return `No contact found matching "${params.contactName}".`;

    const contact = contacts[0];
    const take = params.limit ?? 20;

    // Get activity records (calls, emails, notes) for this contact
    const activities = await db.activity.findMany({
      where: { contactId: contact.id },
      orderBy: { createdAt: "desc" },
      take,
      select: { type: true, title: true, content: true, createdAt: true },
    });

    // Get SMS chat messages tied to this contact via metadata
    const chatMessages = await db.chatMessage.findMany({
      where: {
        workspaceId,
        metadata: { path: ["contactId"], equals: contact.id },
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    if (!activities.length && !chatMessages.length) {
      return `No conversation history found for ${contact.name}.`;
    }

    // Merge and sort by date
    type HistoryItem = { date: Date; text: string };
    const items: HistoryItem[] = [];

    for (const a of activities) {
      const dateStr = a.createdAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
      items.push({
        date: a.createdAt,
        text: `[${dateStr}] ${a.type}: ${a.title}${a.content ? ` — ${a.content.substring(0, 200)}` : ""}`,
      });
    }

    for (const m of chatMessages) {
      const dateStr = m.createdAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
      const direction = (m.metadata as any)?.direction === "outbound" ? "You" : contact.name;
      items.push({
        date: m.createdAt,
        text: `[${dateStr}] SMS ${direction}: ${m.content.substring(0, 200)}`,
      });
    }

    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    const limited = items.slice(0, take);

    return `Conversation history with ${contact.name} (${contact.phone || "no phone"}):\n${limited.map(i => i.text).join("\n")}`;
  } catch (err) {
    return `Error fetching history: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * AI Tool Action: Create a scheduled notification for the user.
 * Used when the user says "notify me when X" or "remind me 2 days before Y".
 */
export async function runCreateScheduledNotification(
  workspaceId: string,
  params: { title: string; message: string; scheduledAtISO?: string; link?: string }
): Promise<string> {
  try {
    // Find the workspace owner
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { ownerId: true },
    });
    let targetUserId = workspace?.ownerId;
    if (!targetUserId) {
      // Fallback: find first user in workspace
      const user = await db.user.findFirst({
        where: { workspaceId },
        select: { id: true },
      });
      if (!user) return "Could not find a user to notify in this workspace.";
      targetUserId = user.id;
    }

    // For immediate notifications
    if (!params.scheduledAtISO) {
      await createNotification({
        userId: targetUserId,
        title: params.title,
        message: params.message,
        type: "INFO",
        link: params.link,
      });
      return `Notification created: "${params.title}" — ${params.message}`;
    }

    // For scheduled notifications, create a Task with a notification trigger
    const dueAt = new Date(params.scheduledAtISO);
    if (isNaN(dueAt.getTime())) {
      return `Invalid date: "${params.scheduledAtISO}". Try something like "tomorrow 9am" or "2026-02-25T14:00:00".`;
    }

    // Create both a task (for calendar visibility) and a notification
    await createTask({
      title: params.title,
      description: params.message,
      dueAt,
    });
    await createNotification({
      userId: targetUserId,
      title: params.title,
      message: params.message,
      type: "INFO",
      link: params.link || "/dashboard/schedule",
    });

    const dateStr = dueAt.toLocaleDateString("en-AU", {
      weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit"
    });
    return `Scheduled notification: "${params.title}" for ${dateStr}. A task has also been added to your calendar.`;
  } catch (err) {
    return `Error creating notification: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ─── Undo Last Action ───────────────────────────────────────────────

/**
 * Undo the most recent chatbot action for a workspace.
 * Supports: undoing deal creation, deal stage moves, and contact creation.
 * Uses the Activity log to discover the last action taken.
 */
export async function runUndoLastAction(workspaceId: string): Promise<string> {
  try {
    // Find the most recent activity logged by the AI
    const lastActivity = await db.activity.findFirst({
      where: {
        deal: { workspaceId },
      },
      orderBy: { createdAt: "desc" },
      include: { deal: true },
    });

    if (!lastActivity) {
      return "No recent actions found to undo.";
    }

    const description = lastActivity.description ?? lastActivity.title ?? "";
    const descLower = description.toLowerCase();

    // Undo a deal stage move (restore from metadata)
    if (descLower.includes("moved to") || descLower.includes("stage changed")) {
      const deal = lastActivity.deal;
      if (!deal) return "Could not find the associated deal to undo.";

      const meta = (deal.metadata as Record<string, unknown>) ?? {};
      const previousStage = meta.previousStage as string | undefined;

      if (previousStage) {
        await db.deal.update({
          where: { id: deal.id },
          data: { stage: previousStage },
        });
        await db.activity.delete({ where: { id: lastActivity.id } });
        revalidatePath("/dashboard");
        return `Undone: "${deal.title}" moved back to "${previousStage}" stage.`;
      }

      return `Cannot undo: no previous stage recorded for "${deal.title}".`;
    }

    // Undo deal creation (delete the deal)
    if (descLower.includes("created deal") || descLower.includes("new deal") || descLower.includes("new job")) {
      const deal = lastActivity.deal;
      if (!deal) return "Could not find the deal to undo.";

      await db.activity.deleteMany({ where: { dealId: deal.id } });
      await db.deal.delete({ where: { id: deal.id } });
      revalidatePath("/dashboard");
      return `Undone: Deal "${deal.title}" has been deleted.`;
    }

    return `The last action ("${description}") cannot be automatically undone. You may need to reverse it manually.`;
  } catch (err) {
    return `Error undoing action: ${err instanceof Error ? err.message : String(err)}`;
  }
}

