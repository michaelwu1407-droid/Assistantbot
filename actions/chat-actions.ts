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

/**
 * Find similar contact names using fuzzy matching
 * Returns contacts sorted by similarity score (highest first)
 */
function findSimilarNames<T extends { id: string; name: string | null; createdAt: Date }>(
  query: string,
  contacts: T[],
  threshold: number = 0.4
): (T & { score: number })[] {
  const queryLower = query.toLowerCase().trim();
  
  const scored = contacts
    .filter(c => c.name) // Only check contacts with names
    .map(c => {
      const nameLower = c.name!.toLowerCase();
      let score = 0;
      
      // Exact match (should have been caught earlier, but just in case)
      if (nameLower === queryLower) score = 1.0;
      // Contains match
      else if (nameLower.includes(queryLower) || queryLower.includes(nameLower)) score = 0.9;
      // Fuzzy match using Levenshtein distance
      else {
        score = fuzzyScore(queryLower, nameLower);
      }
      
      return {
        ...c,
        score
      };
    })
    .filter(c => c.score >= threshold)
    .sort((a, b) => b.score - a.score);
  
  return scored;
}

/**
 * Format a date as a friendly time ago string
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 30) {
    return date.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  } else if (diffMins > 0) {
    return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  } else {
    return "just now";
  }
}

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
    title: "Proposed Job Time",
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
    notes?: string; // New notes field for language preferences
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
      notes: params.notes, // Store language preferences and other notes
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
    notes?: string; // New notes field for language preferences
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
    notes: draft.notes?.trim(), // Pass notes for language preferences
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
/**
 * AI Tool Action: Create a Task/Reminder
 */
export async function runCreateTask(params: { title: string, dueAtISO?: string, description?: string, dealId?: string, contactId?: string }) {
  // 🎯 AI AGENT COMMUNICATION - IMPORTANT:
  // This function creates a task/reminder in the CRM system
  // It does not initiate any external communication (calls, emails, etc.)
  // For manual communication, user clicks Call/Text buttons on contact cards
  // DO NOT confuse AI agent with manual communication methods
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
 * 
 * 🎯 AI AGENT COMMUNICATION - IMPORTANT:
 * This function uses the PROVISIONED TWILIO NUMBER (app's number)
 * User's personal number is NEVER used here
 * For manual communication, user clicks Call/Text buttons on contact cards
 * DO NOT confuse AI agent with manual communication methods
 * 
 * IMPROVED: Graceful handling of name mismatches with fuzzy matching suggestions
 */
export async function runSendSms(
  workspaceId: string,
  params: { contactName: string; message: string }
): Promise<string> {
  try {
    const contacts = await searchContacts(workspaceId, params.contactName);
    
    // If no exact match, try fuzzy matching for similar names
    if (!contacts.length) {
      const allContacts = await db.contact.findMany({
        where: { workspaceId },
        select: { id: true, name: true, phone: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      
      // Find similar names using fuzzy matching
      const similarContacts = findSimilarNames(params.contactName, allContacts);
      
      if (similarContacts.length > 0) {
        // Format suggestions for user
        const suggestions = similarContacts.slice(0, 3).map((c, i) => 
          `${i + 1}. ${c.name}${c.phone ? ` (${c.phone})` : ""} - added ${formatTimeAgo(c.createdAt)}`
        ).join("\n");
        
        return `I couldn't find "${params.contactName}" in your contacts. Did you mean one of these?\n\n${suggestions}\n\nReply with the number (1, 2, or 3) to message them, or say "create new" to add "${params.contactName}" as a new contact.`;
      }
      
      // No similar contacts found - offer to create new
      return `I couldn't find "${params.contactName}" in your contacts, and I don't see any similar names.\n\nWould you like me to:\n1. Create a new contact "${params.contactName}" and then send the message\n2. Show you a list of all your contacts\n3. Try a different spelling\n\nJust let me know which option you'd prefer!`;
    }

    // Rest of the existing SMS sending logic...
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
 * 
 * IMPROVED: Graceful handling of name mismatches with fuzzy matching suggestions
 */
export async function runSendEmail(
  workspaceId: string,
  params: { contactName: string; subject: string; body: string }
): Promise<string> {
  try {
    const contacts = await searchContacts(workspaceId, params.contactName);
    
    // If no exact match, try fuzzy matching for similar names
    if (!contacts.length) {
      const allContacts = await db.contact.findMany({
        where: { workspaceId },
        select: { id: true, name: true, email: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      
      // Find similar names using fuzzy matching
      const similarContacts = findSimilarNames(params.contactName, allContacts);
      
      if (similarContacts.length > 0) {
        const suggestions = similarContacts.slice(0, 3).map((c, i) => 
          `${i + 1}. ${c.name}${c.email ? ` (${c.email})` : ""} - added ${formatTimeAgo(c.createdAt)}`
        ).join("\n");
        
        return `I couldn't find "${params.contactName}" in your contacts. Did you mean one of these?\n\n${suggestions}\n\nReply with the number (1, 2, or 3) to email them, or say "create new" to add "${params.contactName}" as a new contact.`;
      }
      
      return `I couldn't find "${params.contactName}" in your contacts, and I don't see any similar names.\n\nWould you like me to:\n1. Create a new contact "${params.contactName}" and then send the email\n2. Show you a list of all your contacts\n3. Try a different spelling\n\nJust let me know which option you'd prefer!`;
    }

    const contact = contacts[0];
    if (!contact.email) return `Contact "${contact.name}" has no email address on file. Add one first.`;

    // Rest of the email sending logic...
    const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
    const senderName = workspace?.name ?? "Pj Buddy";

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
 * 
 * IMPROVED: Graceful handling of name mismatches with fuzzy matching suggestions
 */
export async function runMakeCall(
  workspaceId: string,
  params: { contactName: string; purpose?: string }
): Promise<string> {
  try {
    const contacts = await searchContacts(workspaceId, params.contactName);
    
    // If no exact match, try fuzzy matching for similar names
    if (!contacts.length) {
      const allContacts = await db.contact.findMany({
        where: { workspaceId },
        select: { id: true, name: true, phone: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      
      // Find similar names using fuzzy matching
      const similarContacts = findSimilarNames(params.contactName, allContacts);
      
      if (similarContacts.length > 0) {
        const suggestions = similarContacts.slice(0, 3).map((c, i) => 
          `${i + 1}. ${c.name}${c.phone ? ` (${c.phone})` : ""} - added ${formatTimeAgo(c.createdAt)}`
        ).join("\n");
        
        return `I couldn't find "${params.contactName}" in your contacts. Did you mean one of these?\n\n${suggestions}\n\nReply with the number (1, 2, or 3) to call them, or say "create new" to add "${params.contactName}" as a new contact.`;
      }
      
      return `I couldn't find "${params.contactName}" in your contacts, and I don't see any similar names.\n\nWould you like me to:\n1. Create a new contact "${params.contactName}" and then call them\n2. Show you a list of all your contacts\n3. Try a different spelling\n\nJust let me know which option you'd prefer!`;
    }

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

// ─── Assign Team Member ─────────────────────────────────────────────

/**
 * AI Tool Action: Assign a team member to a job/deal.
 * Fuzzy-matches both the deal title and team member name within the workspace.
 */
export async function runAssignTeamMember(
  workspaceId: string,
  params: { dealTitle: string; teamMemberName: string }
): Promise<{ success: boolean; message: string }> {
  try {
    // Find the deal
    const deals = await getDeals(workspaceId);
    const deal = findDealByTitle(deals, params.dealTitle.trim());
    if (!deal) {
      const suggestions = deals.slice(0, 5).map(d => `"${d.title}"`).join(", ");
      return {
        success: false,
        message: `Couldn't find a job matching "${params.dealTitle}".${deals.length > 0 ? ` Current jobs: ${suggestions}` : " No jobs yet."}`,
      };
    }

    // Find the team member in this workspace
    const members = await db.user.findMany({
      where: { workspaceId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!members.length) {
      return { success: false, message: "No team members found in this workspace." };
    }

    const query = params.teamMemberName.toLowerCase().trim();
    // Exact name match first
    let member = members.find(m => m.name?.toLowerCase() === query);
    // Contains match
    if (!member) member = members.find(m => m.name?.toLowerCase().includes(query) || query.includes(m.name?.toLowerCase() ?? ""));
    // Email match
    if (!member) member = members.find(m => m.email.toLowerCase().includes(query));
    // Fuzzy match
    if (!member) {
      let bestMember: typeof members[0] | null = null;
      let bestScore = 0;
      for (const m of members) {
        const score = fuzzyScore(query, (m.name ?? m.email).toLowerCase());
        if (score > bestScore && score >= 0.4) {
          bestScore = score;
          bestMember = m;
        }
      }
      member = bestMember ?? undefined;
    }

    if (!member) {
      const memberList = members.map(m => m.name || m.email).join(", ");
      return {
        success: false,
        message: `No team member matching "${params.teamMemberName}". Available: ${memberList}`,
      };
    }

    // Assign the team member to the deal
    await db.deal.update({
      where: { id: deal.id },
      data: { assignedToId: member.id },
    });

    // Log the assignment as an activity
    await logActivity({
      type: "NOTE",
      title: `Assigned to ${member.name || member.email}`,
      content: `Job "${deal.title}" assigned to ${member.name || member.email} by AI assistant.`,
      dealId: deal.id,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/deals");
    return {
      success: true,
      message: `Assigned "${deal.title}" to ${member.name || member.email}.`,
    };
  } catch (err) {
    return {
      success: false,
      message: `Error assigning team member: ${err instanceof Error ? err.message : String(err)}`,
    };
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
      const validStages = ["NEW", "CONTACTED", "NEGOTIATION", "SCHEDULED", "PIPELINE", "INVOICED", "WON", "LOST", "DELETED", "ARCHIVED"] as const;
      type DealStage = (typeof validStages)[number];

      if (previousStage && validStages.includes(previousStage as DealStage)) {
        await db.deal.update({
          where: { id: deal.id },
          data: { stage: previousStage as any },
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

/**
 * Handle support requests from chatbot
 */
export async function handleSupportRequest(
  message: string,
  userId: string,
  workspaceId: string
): Promise<string> {
  const lowerMessage = message.toLowerCase();
  
  // Extract support details
  const subject = extractSupportSubject(lowerMessage);
  const priority = extractPriority(lowerMessage);
  
  // Get user and workspace context
  const [user, workspace] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, phone: true }
    }),
    db.workspace.findUnique({
      where: { id: workspaceId },
      select: { 
        name: true, 
        twilioPhoneNumber: true, 
        type: true,
        twilioSubaccountId: true,
        retellAgentId: true
      }
    })
  ]);

  if (!user || !workspace) {
    return "I'm having trouble accessing your account details. Please try again or contact support directly.";
  }

  // Log support request to activity feed
  await db.activity.create({
    data: {
      type: "NOTE",
      title: `Chatbot Support Request: ${subject}`,
      content: `Priority: ${priority}\n\nOriginal message: "${message}"\n\nUser: ${user.email}\nPhone: ${user.phone || "Not provided"}\nWorkspace: ${workspace.name}\nAI Agent Number: ${workspace.twilioPhoneNumber || "Not configured"}\nTwilio Account: ${workspace.twilioSubaccountId ? "Active" : "Not setup"}\nVoice Agent: ${workspace.retellAgentId ? "Active" : "Not setup"}`,
    },
  });

  // Categorize and provide immediate help
  if (lowerMessage.includes("phone number") || lowerMessage.includes("twilio") || lowerMessage.includes("ai agent")) {
    return `I've logged your support request about phone/AI agent issues. Here's what I can see:\n\n📱 AI Agent Number: ${workspace.twilioPhoneNumber || "Not configured"}\n🔧 Twilio Account: ${workspace.twilioSubaccountId ? "Active" : "Not setup"}\n🤖 Voice Agent: ${workspace.retellAgentId ? "Active" : "Not setup"}\n\nIf your AI agent number isn't working, this usually means setup didn't complete during onboarding. Our support team will contact you within 24 hours to fix this.\n\nFor immediate help, you can also:\n• Call 1300 PJ BUDDY (Mon-Fri 9am-5pm)\n• Email support@pjbuddy.com`;
  }

  if (lowerMessage.includes("billing") || lowerMessage.includes("payment") || lowerMessage.includes("subscription")) {
    return `I've logged your billing support request. Our billing team will review your account and contact you within 24 hours.\n\nFor immediate billing questions:\n• Check your Billing settings in the dashboard\n• Email billing@pjbuddy.com\n• Call 1300 PJ BUDDY and select billing option`;
  }

  if (lowerMessage.includes("feature") || lowerMessage.includes("request") || lowerMessage.includes("suggestion")) {
    return `Great! I've logged your feature request. Our product team reviews all suggestions weekly.\n\nYour request has been tagged as "${priority}" priority and will be considered for future updates. We'll email you at ${user.email} when there's an update.`;
  }

  // General support
  return `I've created a support ticket for you with subject: "${subject}" (${priority} priority).\n\nOur support team will contact you within 24 hours at ${user.email}. For urgent issues, call 1300 PJ BUDDY (Mon-Fri 9am-5pm AEST).\n\nIs there anything else I can help you with while you wait?`;
}

/**
 * Extract support subject from message
 */
function extractSupportSubject(message: string): string {
  if (message.includes("phone") || message.includes("twilio") || message.includes("ai agent")) return "Phone/AI Agent Issue";
  if (message.includes("billing") || message.includes("payment") || message.includes("subscription")) return "Billing Question";
  if (message.includes("feature") || message.includes("request") || message.includes("suggestion")) return "Feature Request";
  if (message.includes("bug") || message.includes("error") || message.includes("broken")) return "Bug Report";
  if (message.includes("account") || message.includes("login") || message.includes("password")) return "Account Issue";
  return "General Support";
}

/**
 * Extract priority from message
 */
function extractPriority(message: string): string {
  if (message.includes("urgent") || message.includes("emergency") || message.includes("critical")) return "urgent";
  if (message.includes("important") || message.includes("high") || message.includes("asap")) return "high";
  if (message.includes("low") || message.includes("minor") || message.includes("whenever")) return "low";
  return "medium";
}

