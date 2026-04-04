"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/lib/auth";
import { runIdempotent } from "@/lib/idempotency";
import crypto from "crypto";
import { getWorkspaceSettingsById } from "@/actions/settings-actions";
import { getDeals, createDeal, updateDealStage, updateDealMetadata, updateDealAssignedTo } from "./deal-actions";
import { appendTicketNote, logActivity } from "./activity-actions";
import { createContact, searchContacts } from "./contact-actions";
import { completeTask, createTask, deleteTask, getTasks } from "./task-actions";
import { createNotification } from "./notification-actions";
import { generateMorningDigest, generateEveningDigest, type DailyDigest } from "@/lib/digest";
import { getTemplates, renderTemplate } from "./template-actions";
import { findDuplicateContacts } from "./dedup-actions";
import { generateQuote } from "./tradie-actions";
import { fuzzyScore } from "@/lib/search";
import { recordWorkspaceAuditEventForCurrentActor } from "@/lib/workspace-audit";
import { allocateWorkspaceInvoiceNumber } from "@/lib/invoice-number";
import {
  titleCase,
  categoriseWork,
  resolveSchedule,
  enrichAddress,
  WORK_CATEGORIES,
  STREET_ABBREVS,
  DAY_ABBREVS,
} from "@/lib/chat-utils";
import {
  canExecuteCustomerContact,
  getCustomerContactModeLabel,
  normalizeAgentMode,
  requiresCustomerContactApproval,
} from "@/lib/agent-mode";
import { getAttentionSignalsForDeal } from "@/lib/deal-attention";
import { logger } from "@/lib/logging";

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

async function getCustomerContactGuardResult(
  workspaceId: string,
  action: "text" | "email" | "call",
  summary: string,
  enforceCustomerContactMode?: boolean
): Promise<string | null> {
  if (!enforceCustomerContactMode) return null;

  const settings = await getWorkspaceSettingsById(workspaceId);
  const mode = normalizeAgentMode(settings?.agentMode);
  const modeLabel = getCustomerContactModeLabel(mode);

  if (canExecuteCustomerContact(mode)) {
    return null;
  }

  if (requiresCustomerContactApproval(mode)) {
    return `I couldn't send this ${action} because customer-contact mode is "${modeLabel}". I prepared a draft instead and did not send anything: ${summary}. Next step: ask a manager/owner to approve and send.`;
  }

  return `I couldn't send this ${action} because customer-contact mode is "${modeLabel}". Customer ${action} actions are disabled in this mode. I did not send anything.`;
}

// ─── Stage Alias Mapping ─────────────────────────────────────────────
// Maps user-facing stage names to the canonical frontend stage keys used by
// deal-actions. Chat should speak the same stage language as the live CRM.
const STAGE_ALIASES: Record<string, string> = {
  // Canonical frontend keys
  "new": "new_request",
  "new request": "new_request",
  "quote sent": "quote_sent",
  "quoted": "quote_sent",
  "quoting": "quote_sent",
  "scheduled": "scheduled",
  "ready to invoice": "ready_to_invoice",
  "pending approval": "pending_approval",
  "completed": "completed",
  "lost": "lost",
  "deleted": "deleted",
  // Legacy/internal aliases
  "contacted": "quote_sent",
  "negotiation": "scheduled",
  "pipeline": "quote_sent",
  "invoiced": "ready_to_invoice",
  "won": "completed",
  // Generic CRM
  "new lead": "new_request",
  "lead": "new_request",
  // Trades
  "new job": "new_request",
  "new jobs": "new_request",
  "quote": "quote_sent",
  "in progress": "scheduled",
  "in-progress": "scheduled",
  "inprogress": "scheduled",
  "progress": "scheduled",
  "complete": "completed",
  "done": "completed",
  "finished": "completed",
  // Real Estate
  "new listing": "new_request",
  "new listings": "new_request",
  "listing": "new_request",
  "appraised": "quote_sent",
  "appraisal": "quote_sent",
  "under offer": "scheduled",
  "under-offer": "scheduled",
  "offer": "scheduled",
  "settled": "completed",
  "settlement": "completed",
  "under contract": "completed",
  "exchanged": "completed",
  "withdrawn": "lost",
  "cancelled": "lost",
  "canceled": "lost",
  // Construction
  "awarded": "completed",
  // Paid / Invoice stages
  "paid": "completed",
  "invoice": "ready_to_invoice",
};

const PRISMA_STAGE_TO_CHAT_STAGE: Record<string, string> = {
  NEW: "new_request",
  CONTACTED: "quote_sent",
  NEGOTIATION: "scheduled",
  SCHEDULED: "scheduled",
  PIPELINE: "quote_sent",
  INVOICED: "ready_to_invoice",
  PENDING_COMPLETION: "pending_approval",
  WON: "completed",
  LOST: "lost",
  DELETED: "deleted",
  ARCHIVED: "archived",
};

const CHAT_STAGE_LABELS: Record<string, string> = {
  new_request: "New request",
  quote_sent: "Quote sent",
  scheduled: "Scheduled",
  ready_to_invoice: "Ready to invoice",
  pending_approval: "Pending approval",
  completed: "Completed",
  lost: "Lost",
  deleted: "Deleted",
};

function getDealNextStepGuidance(input: {
  chatStage: string;
  hasSchedule: boolean;
  hasInvoice: boolean;
}): string | null {
  switch (input.chatStage) {
    case "new_request":
      return "Review the request, then either send a quote or assign a team member and set a scheduled date before moving it forward.";
    case "quote_sent":
      return "Confirm the customer wants to proceed, then assign a team member and schedule the job.";
    case "scheduled":
      return input.hasInvoice
        ? "Finish the work, update any notes, and mark the invoice status correctly when the job is done."
        : "Complete the work, record any field notes or materials, and generate the invoice when the job is finished.";
    case "ready_to_invoice":
      return input.hasInvoice
        ? "Issue the invoice or update its status, then follow through to payment."
        : "Generate the invoice and send or review it before closing out payment.";
    case "pending_approval":
      return "Review the completion details, then approve it to move to completed or reject it with a reason.";
    case "completed":
      return input.hasInvoice
        ? "The job is completed. The main remaining step is making sure the invoice and payment status are correct."
        : "The job is completed. Generate or issue the invoice if billing is still outstanding.";
    default:
      return null;
  }
}

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

/** Fuzzy-match a deal title from the deals list while preserving extra fields. */
function findDealByTitle<T extends { id: string; title: string }>(deals: T[], query: string): T | null {
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
  let bestDeal: T | null = null;
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
  stageAlias: string,
  assignedTo?: string
): Promise<{ success: boolean; message: string; dealId?: string; stage?: string; requiresAssignment?: boolean }> {
  const deals = await getDeals(workspaceId, undefined, { unbounded: true });
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

  // Check if moving to Scheduled and needs team member assignment
  if (resolvedStage === "scheduled" && !deal.assignedToId && !assignedTo) {
    return {
      success: false,
      message: `"${dealTitle}" needs a team member assigned to move to Scheduled. Who should I assign this job to?`,
      requiresAssignment: true,
      dealId: deal.id,
    };
  }

  // If team member provided, assign them first
  if (assignedTo && resolvedStage === "scheduled") {
    const assignResult = await updateDealAssignedTo(deal.id, assignedTo);
    if (!assignResult.success) {
      return { success: false, message: assignResult.error ?? "Failed to assign team member." };
    }
  }

  const result = await updateDealStage(deal.id, resolvedStage);
  if (!result.success) {
    return { success: false, message: result.error ?? "Failed to move deal." };
  }
  const stageLabel = CHAT_STAGE_LABELS[resolvedStage] ?? resolvedStage;
  revalidatePath("/crm", "layout");
  revalidatePath("/crm/deals");
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
  const deals = await getDeals(workspaceId, undefined, { unbounded: true });
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
  revalidatePath("/crm", "layout");
  revalidatePath("/crm/deals");
  return {
    success: true,
    message: `Proposed ${display} for "${deal.title}". I’ve logged it and added a task to confirm with ${contactName} (due tomorrow 9am).`,
  };
}

/**
 * List deals for the LLM (title, stage, value). Used by the chat listDeals tool.
 */
export async function runListDeals(workspaceId: string): Promise<{ deals: { id: string; title: string; stage: string; value: number }[] }> {
  const deals = await getDeals(workspaceId, undefined, { unbounded: true });
  return {
    deals: deals.map((d) => ({
      id: d.id,
      title: d.title,
      stage: d.stage,
      value: d.value,
    })),
  };
}

function matchesDealQuery(
  deal: { title?: string; company?: string; contactName?: string },
  query: string,
) {
  const cleaned = query.trim().toLowerCase();
  if (!cleaned) return true;
  return [deal.title, deal.company, deal.contactName]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .some((field) => field.includes(cleaned));
}

export async function runListInvoiceReadyJobs(
  workspaceId: string,
  params: { query: string },
): Promise<string> {
  const deals = await getDeals(workspaceId, undefined, { unbounded: true });
  const matches = deals.filter((deal) =>
    matchesDealQuery(deal, params.query) &&
    (deal.stage === "ready_to_invoice" || (typeof deal.invoicedAmount === "number" && deal.invoicedAmount > 0)),
  );

  if (!matches.length) {
    return `No jobs matching "${params.query}" are ready to invoice or already invoiced.`;
  }

  return `Jobs matching "${params.query}" that are ready to invoice or already invoiced:\n${matches
    .map((deal) => {
      const suffix: string[] = [];
      if (deal.stage === "ready_to_invoice") suffix.push("ready to invoice");
      if (typeof deal.invoicedAmount === "number" && deal.invoicedAmount > 0) suffix.push(`invoice $${deal.invoicedAmount}`);
      return `- ${deal.title}${suffix.length ? ` (${suffix.join("; ")})` : ""}`;
    })
    .join("\n")}`;
}

export async function runListIncompleteOrBlockedJobs(
  workspaceId: string,
  params: { query: string },
): Promise<string> {
  const deals = await getDeals(workspaceId, undefined, { unbounded: true });
  const matches = deals
    .filter((deal) => matchesDealQuery(deal, params.query))
    .map((deal) => ({
      deal,
      signals: getAttentionSignalsForDeal({
        id: deal.id,
        title: deal.title,
        stage: deal.stage,
        health: deal.health,
        scheduledAt: deal.scheduledAt ?? null,
        actualOutcome: deal.actualOutcome ?? null,
        metadata: deal.metadata ?? null,
      }),
    }))
    .filter(({ deal, signals }) => signals.length > 0 || !["completed", "lost", "deleted", "archived"].includes(deal.stage));

  if (!matches.length) {
    return `No jobs matching "${params.query}" look incomplete or blocked.`;
  }

  return `Jobs matching "${params.query}" that still look incomplete or blocked:\n${matches
    .map(({ deal, signals }) => {
      const suffix: string[] = [deal.stage];
      if (signals.length) suffix.push(signals.map((signal) => signal.label).join(", "));
      return `- ${deal.title}${suffix.length ? ` (${suffix.join("; ")})` : ""}`;
    })
    .join("\n")}`;
}

export async function runGetAttentionRequired(workspaceId: string): Promise<{
  success: boolean;
  message: string;
  quickActions: { label: string; prompt: string }[];
}> {
  const deals = await getDeals(workspaceId, undefined, { unbounded: true });
  const flagged = deals
    .map((deal) => ({
      deal,
      signals: getAttentionSignalsForDeal({
        id: deal.id,
        title: deal.title,
        stage: deal.stage,
        health: deal.health,
        scheduledAt: deal.scheduledAt ?? null,
        actualOutcome: deal.actualOutcome ?? null,
        metadata: deal.metadata ?? null,
      }),
    }))
    .filter((entry) => entry.signals.length > 0)
    .slice(0, 8);

  if (!flagged.length) {
    return {
      success: true,
      message: "Nothing is flagged right now. No overdue, stale, rotting, rejected, or parked jobs need attention.",
      quickActions: [
        { label: "Show today's schedule", prompt: "Show today's schedule and readiness alerts" },
      ],
    };
  }

  const lines = flagged.map(({ deal, signals }) => {
    const signalText = signals.map((s) => s.label).join(", ");
    return `- ${deal.title} (${signalText})`;
  });

  return {
    success: true,
    message: `Here is what needs attention:\n${lines.join("\n")}`,
    quickActions: [
      { label: "Show overdue only", prompt: "Show only overdue jobs that need reconciliation" },
      { label: "Show rejected jobs", prompt: "Show jobs that were rejected and need updates" },
      { label: "Create follow-up tasks", prompt: "Create follow-up tasks for all attention-required jobs" },
    ],
  };
}

/**
 * Create a deal by title and optional company/value. Finds or creates contact. Used by chat createDeal tool.
 */
export async function runCreateDeal(
  workspaceId: string,
  params: { title: string; company?: string; value?: number; assignedTo?: string }
): Promise<{ success: boolean; message: string; dealId?: string }> {
  let contactId: string | undefined;
  const company = (params.company ?? params.title).trim() || "Unknown";
  const contacts = await searchContacts(workspaceId, company);
  contactId = contacts[0]?.id;
  if (!contactId) {
    const result = await createContact({ name: company, workspaceId, contactType: "BUSINESS" });
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
    assignedToId: params.assignedTo || null,
  });
  if (!result.success) {
    return { success: false, message: result.error ?? "Failed to create deal." };
  }
  revalidatePath("/crm", "layout");
  revalidatePath("/crm/deals");
  return {
    success: true,
    message: `Created deal "${params.title}"${params.value != null && params.value > 0 ? ` worth $${params.value.toLocaleString()}` : ""}.`,
    dealId: result.dealId,
  };
}

async function getDealsByIds(workspaceId: string, dealIds: string[]) {
  const uniqueIds = Array.from(new Set(dealIds.map((id) => id.trim()).filter(Boolean)));
  if (!uniqueIds.length) return [];

  return db.deal.findMany({
    where: {
      workspaceId,
      id: { in: uniqueIds },
    },
    select: {
      id: true,
      title: true,
      stage: true,
      assignedToId: true,
      workspaceId: true,
      contactId: true,
      metadata: true,
    },
  });
}

async function resolveTeamMember(workspaceId: string, teamMemberName: string) {
  const members = await db.user.findMany({
    where: { workspaceId },
    select: { id: true, name: true, email: true, role: true },
  });

  const query = teamMemberName.toLowerCase().trim();
  let member = members.find((m) => m.name?.toLowerCase() === query);
  if (!member) member = members.find((m) => m.name?.toLowerCase().includes(query) || query.includes(m.name?.toLowerCase() ?? ""));
  if (!member) member = members.find((m) => m.email.toLowerCase().includes(query));
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

  return { member, members };
}

function formatBulkOperationSummary(
  label: string,
  results: Array<{ id: string; title: string; status: "success" | "skipped" | "blocked"; reason?: string }>
) {
  const succeeded = results.filter((result) => result.status === "success");
  const skipped = results.filter((result) => result.status === "skipped");
  const blocked = results.filter((result) => result.status === "blocked");
  const lines = [
    `${label}: ${succeeded.length} succeeded, ${skipped.length} skipped, ${blocked.length} blocked.`,
  ];

  for (const result of results) {
    const prefix = result.status === "success" ? "OK" : result.status === "skipped" ? "SKIP" : "BLOCKED";
    lines.push(`- [${prefix}] ${result.title} (${result.id})${result.reason ? `: ${result.reason}` : ""}`);
  }

  return lines.join("\n");
}

export async function runUpdateDealFields(
  workspaceId: string,
  params: {
    dealTitle: string;
    newTitle?: string;
    value?: number;
    address?: string;
    schedule?: string;
    newStage?: string;
  }
): Promise<{ success: boolean; message: string; dealId?: string }> {
  const deals = await getDeals(workspaceId, undefined, { unbounded: true });
  const deal = findDealByTitle(deals, params.dealTitle.trim());
  if (!deal) {
    const suggestions = deals.slice(0, 5).map((d) => `"${d.title}"`).join(", ");
    return {
      success: false,
      message: `Couldn't find a job matching "${params.dealTitle}".${deals.length > 0 ? ` Current jobs: ${suggestions}` : " No jobs yet."}`,
    };
  }

  const payload: {
    title?: string;
    value?: number;
    address?: string | null;
    scheduledAt?: string | null;
    stage?: string;
  } = {};

  if (params.newTitle?.trim()) payload.title = params.newTitle.trim();
  if (typeof params.value === "number") payload.value = params.value;
  if (params.address !== undefined) payload.address = params.address.trim() || null;
  if (params.schedule !== undefined) payload.scheduledAt = params.schedule.trim() || null;
  if (params.newStage?.trim()) {
    const resolvedStage = resolveStage(params.newStage.trim());
    if (!resolvedStage) {
      return { success: false, message: `Unknown stage "${params.newStage}".` };
    }
    payload.stage = resolvedStage;
  }

  if (!Object.keys(payload).length) {
    return { success: false, message: "No job changes were provided." };
  }

  const { updateDeal } = await import("./deal-actions");
  const result = await updateDeal(deal.id, payload);
  if (!result.success) {
    return { success: false, message: result.error ?? "Failed to update the job." };
  }

  const changes: string[] = [];
  if (payload.title) changes.push(`title`);
  if (typeof payload.value === "number") changes.push(`value`);
  if (payload.address !== undefined) changes.push(`address`);
  if (payload.scheduledAt !== undefined) changes.push(`schedule`);
  if (payload.stage) changes.push(`stage`);

  return {
    success: true,
    message: `Updated "${deal.title}" (${changes.join(", ")}).`,
    dealId: deal.id,
  };
}

/**
 * Record manual revenue for a period (e.g. when the user says "I made $200 in February" and the app shows $0).
 * Creates a completed deal so getFinancialReport includes it. Only team managers (OWNER/MANAGER) can confirm; team members must ask their manager.
 */
export async function recordManualRevenue(
  workspaceId: string,
  params: { amount: number; startDate: string; endDate: string }
): Promise<{ success: boolean; message: string }> {
  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return { success: false, message: "Amount must be a positive number." };
  }
  try {
    const authUser = await getAuthUser();
    if (authUser?.email) {
      const dbUser = await db.user.findFirst({
        where: { workspaceId, email: authUser.email },
        select: { role: true },
      });
      if (dbUser?.role === "TEAM_MEMBER") {
        return {
          success: false,
          message: "Only a team manager or owner can confirm data changes. Ask your manager to update this.",
        };
      }
    }
  } catch {
    return { success: false, message: "You must be signed in to confirm changes." };
  }
  let contact = await db.contact.findFirst({
    where: { workspaceId, name: "Manual revenue entry" },
  });
  if (!contact) {
    contact = await db.contact.create({
      data: {
        name: "Manual revenue entry",
        workspaceId,
        email: "manual@internal",
      },
    });
  }
  const start = new Date(params.startDate);
  const midMonth = new Date(start);
  midMonth.setDate(15);
  const title = `Manual revenue entry – ${start.toLocaleDateString("en-AU", { month: "long", year: "numeric" })}`;
  await db.deal.create({
    data: {
      title,
      value: amount,
      stage: "WON",
      contactId: contact.id,
      workspaceId,
      createdAt: midMonth,
    },
  });
  revalidatePath("/crm", "layout");
  revalidatePath("/crm/analytics");
  return {
    success: true,
    message: `Recorded $${amount.toLocaleString()} revenue for that period. Future reports will include it.`,
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
    assignedToId?: string | null;
    notes?: string; // New notes field for language preferences
  }
): Promise<{ success: boolean; message: string; dealId?: string }> {
  const clientName = params.clientName?.trim() || "Unknown";
  const existingContacts = await searchContacts(workspaceId, clientName);
  const matchedExistingContact = existingContacts.find((contact) => {
    const candidate = (contact.name ?? "").trim().toLowerCase();
    const normalizedClientName = clientName.toLowerCase();
    return candidate === normalizedClientName || candidate.includes(normalizedClientName) || normalizedClientName.includes(candidate);
  });

  let contactId = matchedExistingContact?.id;

  if (!contactId) {
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
    contactId = contactResult.contactId!;
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
    contactId,
    workspaceId,
    address: params.address?.trim(),
    scheduledAt,
    assignedToId: params.assignedToId || null,
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
  revalidatePath("/crm", "layout");
  revalidatePath("/crm/deals");
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
    assignedToId?: string | null;
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
    assignedToId: draft.assignedToId || null,
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
    logger.error("saveUserMessage failed", { component: "chat-actions", action: "saveUserMessage", workspaceId }, e as Error);
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
    logger.error("saveAssistantMessage failed", { component: "chat-actions", action: "saveAssistantMessage", workspaceId }, e as Error);
  }
}

export async function getDailyDigest(
  workspaceId: string,
  kind: "morning" | "evening"
): Promise<{ kind: "morning" | "evening"; agentMode: string | null; digest: DailyDigest } | null> {
  if (!workspaceId) return null;
  const settings = await getWorkspaceSettingsById(workspaceId);
  const agentMode = settings?.agentMode ?? null;
  const digest = kind === "morning"
    ? await generateMorningDigest(workspaceId)
    : await generateEveningDigest(workspaceId);
  return { kind, agentMode, digest };
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
    logger.error("clearChatHistoryAction failed", { component: "chat-actions", action: "clearChatHistoryAction", workspaceId }, error as Error);
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
    const deals = await getDeals(workspaceId, undefined, { unbounded: true });
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
    const raw = (rule || "").trim();
    if (!raw) return "I can't add that rule.";

    const normalized = raw.replace(/\s+/g, " ").trim();

    // 1) Strongest enforceable: real setting update (call-out fee).
    // Examples: "Always quote $0 call-out fee", "Call out fee is 0"
    if (/\bcall[-\s]?out\b/i.test(normalized) && /\bfee\b/i.test(normalized)) {
      const match = normalized.match(/(?:\$|aud\s*)?(\d+(?:\.\d{1,2})?)/i);
      if (!match) {
        return `I can't add that rule.`;
      }
      const fee = Number(match[1]);
      if (!Number.isFinite(fee)) return `I can't add that rule.`;

      const { setWorkspaceCallOutFee } = await import("./settings-actions");
      const setRes = await setWorkspaceCallOutFee(workspaceId, fee);
      if (!setRes.success) return "I can't add that rule.";

      const enforced = `Call-out fee is $${setRes.callOutFee}.`;
      return `Done. I will enforce this rule exactly: "${enforced}"`;
    }

    // 2) Strongest enforceable: No-go knowledge (negative scope).
    // Heuristic: user is saying "we don't do X" / "don't do X" / "no X" etc.
    const looksLikeNoGo =
      /^\s*(?:we\s+)?(?:don'?t|do\s+not)\b/i.test(normalized) ||
      /^\s*no\b/i.test(normalized) ||
      /\bwe\s+don'?t\s+do\b/i.test(normalized);

    if (looksLikeNoGo) {
      const safeRule = normalized.endsWith(".") ? normalized : `${normalized}.`;

      // Conservative conflict check: if an existing SERVICE rule mentions the same core keyword,
      // refuse instead of creating contradictory rules.
      const keywords = safeRule
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 3 && !["dont", "don", "not", "do", "we", "no", "work", "works", "handle"].includes(t))
        .slice(0, 6);

      if (keywords.length) {
        const serviceHits = await db.businessKnowledge.findMany({
          where: {
            workspaceId,
            category: "SERVICE",
            OR: keywords.map((k) => ({ ruleContent: { contains: k, mode: "insensitive" as const } })),
          },
          select: { ruleContent: true },
          take: 3,
        }).catch(() => []);

        if (serviceHits.length) {
          return `I can't add that rule.`;
        }
      }

      const { addKnowledgeRule } = await import("./knowledge-actions");
      const addRes = await addKnowledgeRule("NEGATIVE_SCOPE", safeRule, undefined, "ai_preference");
      if (!addRes.success) return "I can't add that rule.";

      return `Done. I will enforce this rule exactly: "${safeRule}"`;
    }

    // 3) Fallback: save as a standard preference (not a hard no-go).
    const { updateAiPreferences } = await import("./settings-actions");
    const result = await updateAiPreferences(workspaceId, normalized);

    if (
      !result.success &&
      "error" in result &&
      (result.error === "rule_limit_reached" || result.error === "rule_validation_failed")
    ) {
      return `I can't add that rule.`;
    }
    if ("skipped" in result && result.skipped === "duplicate") {
      return `Done. I will enforce this rule exactly: "${normalized}"`;
    }

    return `Done. I will enforce this rule exactly: "${normalized}"`;
  } catch (err) {
    return `I can't add that rule.`;
  }
}

/**
 * AI Tool Action: Log an Activity (Call, Note, etc)
 */
export async function runLogActivity(params: { type: string, content: string, dealId?: string, contactId?: string }) {
  try {
    const result = await logActivity({
      type: params.type.toUpperCase() as "CALL" | "EMAIL" | "NOTE" | "MEETING" | "TASK",
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

export async function runAddDealNote(
  workspaceId: string,
  params: { dealTitle: string; note: string }
): Promise<{ success: boolean; message: string; dealId?: string }> {
  const deals = await getDeals(workspaceId, undefined, { unbounded: true });
  const deal = findDealByTitle(deals, params.dealTitle.trim());
  if (!deal) {
    const suggestions = deals.slice(0, 5).map((d) => `"${d.title}"`).join(", ");
    return {
      success: false,
      message: `Couldn't find a job matching "${params.dealTitle}".${deals.length > 0 ? ` Current jobs: ${suggestions}` : " No jobs yet."}`,
    };
  }

  const result = await logActivity({
    type: "NOTE",
    title: "AI note added",
    content: params.note.trim(),
    dealId: deal.id,
    contactId: deal.contactId ?? undefined,
  });

  if (!result.success) {
    return { success: false, message: result.error ?? "Failed to add the note." };
  }

  revalidatePath("/crm", "layout");
  revalidatePath(`/crm/deals/${deal.id}`);

  return {
    success: true,
    message: `Added a note to "${deal.title}".`,
    dealId: deal.id,
  };
}

export async function runAddContactNote(
  workspaceId: string,
  params: { contactName: string; note: string }
): Promise<{ success: boolean; message: string; contactId?: string }> {
  const contacts = await searchContacts(workspaceId, params.contactName.trim());
  const contact = contacts[0];
  if (!contact) {
    return {
      success: false,
      message: `Couldn't find a contact matching "${params.contactName}".`,
    };
  }

  const result = await logActivity({
    type: "NOTE",
    title: "AI note added",
    content: params.note.trim(),
    contactId: contact.id,
  });

  if (!result.success) {
    return { success: false, message: result.error ?? "Failed to add the note." };
  }

  revalidatePath("/crm", "layout");
  revalidatePath(`/crm/contacts/${contact.id}`);

  return {
    success: true,
    message: `Added a note to ${contact.name}.`,
    contactId: contact.id,
  };
}

/**
 * AI Tool Action: Append note to an existing support ticket.
 */
export async function runAppendTicketNote(params: { ticketId: string; noteContent: string }) {
  try {
    const result = await appendTicketNote(params.ticketId, params.noteContent);
    return result;
  } catch (err) {
    return `Error appending ticket note: ${err instanceof Error ? err.message : String(err)}`;
  }
}

const MAX_AGENT_FLAGS_PER_DEAL = 10;

/**
 * AI Tool Action: Add an agent triage flag to a deal.
 * Used by the Bouncer/Advisor engine to mark leads with concerns.
 * Deduplicates and caps at MAX_AGENT_FLAGS_PER_DEAL flags per deal.
 */
export async function runAddAgentFlag(workspaceId: string, params: { dealTitle: string; flag: string }) {
  try {
    const deal = await db.deal.findFirst({
      where: {
        workspaceId,
        title: { contains: params.dealTitle, mode: "insensitive" },
      },
      select: { id: true, agentFlags: true },
    });
    if (!deal) return `Could not find a deal matching "${params.dealTitle}".`;

    const existing = Array.isArray(deal.agentFlags) ? (deal.agentFlags as string[]) : [];

    // Dedup: skip if a substantially similar flag already exists
    const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normNew = normalise(params.flag);
    if (existing.some(f => normalise(f) === normNew)) {
      return `Flag already exists on ${params.dealTitle}: "${params.flag}"`;
    }

    // Cap: keep the most recent flags, drop oldest if at limit
    const updated = [...existing, params.flag];
    if (updated.length > MAX_AGENT_FLAGS_PER_DEAL) {
      updated.splice(0, updated.length - MAX_AGENT_FLAGS_PER_DEAL);
    }

    await db.deal.update({
      where: { id: deal.id },
      data: { agentFlags: updated },
    });

    return `Flag added to ${params.dealTitle}: "${params.flag}"`;
  } catch (err) {
    return `Error adding flag: ${err instanceof Error ? err.message : String(err)}`;
  }
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

export async function runGetDealContext(
  workspaceId: string,
  params: { dealTitle: string }
): Promise<string> {
  const deals = await getDeals(workspaceId, undefined, { unbounded: true });
  const deal = findDealByTitle(deals, params.dealTitle.trim());
  if (!deal) {
    const suggestions = deals.slice(0, 5).map((d) => `"${d.title}"`).join(", ");
    return `Couldn't find a job matching "${params.dealTitle}".${deals.length > 0 ? ` Current jobs: ${suggestions}` : " No jobs yet."}`;
  }

  const fullDeal = await db.deal.findUnique({
    where: { id: deal.id },
    include: {
      contact: {
        select: {
          name: true,
          email: true,
          phone: true,
          company: true,
          address: true,
        },
      },
      invoices: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          number: true,
          status: true,
          total: true,
          createdAt: true,
        },
      },
    },
  });

  if (!fullDeal) {
    return `Couldn't load details for "${deal.title}".`;
  }

  const notes = await db.activity.findMany({
    where: { dealId: deal.id, type: "NOTE" },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { title: true, content: true, createdAt: true },
  });

  const latestInvoice = fullDeal.invoices[0];
  const chatStage = PRISMA_STAGE_TO_CHAT_STAGE[fullDeal.stage] ?? "";
  const nextStepGuidance = getDealNextStepGuidance({
    chatStage,
    hasSchedule: Boolean(fullDeal.scheduledAt),
    hasInvoice: Boolean(latestInvoice),
  });
  const lines = [
    `Job: ${fullDeal.title}`,
    `Stage: ${CHAT_STAGE_LABELS[chatStage] ?? fullDeal.stage}`,
    `Value: $${Number(fullDeal.value ?? 0).toLocaleString()}`,
    fullDeal.address ? `Address: ${fullDeal.address}` : null,
    fullDeal.scheduledAt ? `Scheduled: ${fullDeal.scheduledAt.toLocaleString("en-AU")}` : null,
    fullDeal.contact
      ? `Contact: ${fullDeal.contact.name}${fullDeal.contact.phone ? ` (${fullDeal.contact.phone})` : ""}${fullDeal.contact.email ? `, ${fullDeal.contact.email}` : ""}`
      : null,
    latestInvoice ? `Latest invoice: ${latestInvoice.number} (${latestInvoice.status}) $${Number(latestInvoice.total ?? 0).toLocaleString()}` : null,
    nextStepGuidance ? `Next steps: ${nextStepGuidance}` : null,
  ].filter(Boolean);

  if (notes.length) {
    lines.push("Recent notes:");
    for (const note of notes) {
      lines.push(`- ${note.title}: ${(note.content ?? "").trim() || "No details"} (${formatTimeAgo(note.createdAt)})`);
    }
  }

  return lines.join("\n");
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

async function findInvoiceInWorkspace(
  workspaceId: string,
  params: { invoiceId?: string; dealTitle?: string; contactName?: string }
) {
  if (params.invoiceId?.trim()) {
    return db.invoice.findFirst({
      where: {
        id: params.invoiceId.trim(),
        deal: { workspaceId },
      },
      include: {
        deal: {
          include: { contact: true },
        },
      },
    });
  }

  if (params.dealTitle?.trim()) {
    const deals = await getDeals(workspaceId, undefined, { unbounded: true });
    const target = findDealByTitle(deals, params.dealTitle.trim());
    if (!target) return null;
    return db.invoice.findFirst({
      where: { dealId: target.id },
      orderBy: { createdAt: "desc" },
      include: {
        deal: {
          include: { contact: true },
        },
      },
    });
  }

  if (params.contactName?.trim()) {
    const contacts = await searchContacts(workspaceId, params.contactName.trim());
    const contact = contacts[0];
    if (!contact) return null;
    return db.invoice.findFirst({
      where: {
        deal: {
          workspaceId,
          contactId: contact.id,
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        deal: {
          include: { contact: true },
        },
      },
    });
  }

  return null;
}

export async function runCreateDraftInvoice(
  workspaceId: string,
  params: { dealTitle: string }
) {
  const deals = await getDeals(workspaceId, undefined, { unbounded: true });
  const deal = findDealByTitle(deals, params.dealTitle.trim());
  if (!deal) {
    return `Couldn't find a job matching "${params.dealTitle}".`;
  }

  const existingDraft = await db.invoice.findFirst({
    where: { dealId: deal.id, status: "DRAFT" },
    orderBy: { createdAt: "desc" },
  });
  if (existingDraft) {
    return `Draft invoice ${existingDraft.number} already exists for "${deal.title}".`;
  }

  const fullDeal = await db.deal.findUnique({
    where: { id: deal.id },
    select: { id: true, title: true, value: true, contactId: true },
  });
  if (!fullDeal) return "Deal not found.";

  const invoiceNumber = await allocateWorkspaceInvoiceNumber(workspaceId);
  const total = Number(fullDeal.value || 0);
  const subtotal = Number((total / 1.1).toFixed(2));
  const tax = Number((total - subtotal).toFixed(2));
  await db.invoice.create({
    data: {
      number: invoiceNumber,
      lineItems: JSON.parse(JSON.stringify([{ desc: fullDeal.title, price: total }])),
      subtotal,
      tax,
      total,
      status: "DRAFT",
      dealId: fullDeal.id,
    },
  });
  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Draft invoice created",
      content: `Created draft invoice ${invoiceNumber} for "${fullDeal.title}".`,
      dealId: fullDeal.id,
      contactId: fullDeal.contactId ?? undefined,
    },
  });
  await recordWorkspaceAuditEventForCurrentActor({
    workspaceId,
    action: "invoice.draft_created",
    entityType: "invoice",
    entityId: invoiceNumber,
    metadata: {
      invoiceNumber,
      dealId: fullDeal.id,
      total,
      source: "chat-actions.runCreateDraftInvoiceAction",
    },
  });
  revalidatePath("/crm", "layout");
  return `Created draft invoice ${invoiceNumber} for "${fullDeal.title}".`;
}

export async function runIssueInvoiceAction(
  workspaceId: string,
  params: { invoiceId?: string; dealTitle?: string; contactName?: string }
) {
  const invoice = await findInvoiceInWorkspace(workspaceId, params);
  if (!invoice) {
    return "Couldn't find an invoice for that deal/contact.";
  }

  const { issueInvoice } = await import("./tradie-actions");
  const result = await issueInvoice(invoice.id);
  if (!result.success) {
    return `Failed to issue invoice ${invoice.number}.`;
  }
  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Invoice issued",
      content: `Invoice ${invoice.number} marked as issued.`,
      dealId: invoice.dealId,
      contactId: invoice.deal.contactId,
    },
  });
  return `Issued invoice ${invoice.number} for "${invoice.deal.title}".`;
}

export async function runMarkInvoicePaidAction(
  workspaceId: string,
  params: { invoiceId?: string; dealTitle?: string; contactName?: string }
) {
  const invoice = await findInvoiceInWorkspace(workspaceId, params);
  if (!invoice) {
    return "Couldn't find an invoice for that deal/contact.";
  }

  const { markInvoicePaid } = await import("./tradie-actions");
  const result = await markInvoicePaid(invoice.id);
  if (!result.success) {
    return `Failed to mark invoice ${invoice.number} as paid.`;
  }
  return `Marked invoice ${invoice.number} as paid.`;
}

export async function runReverseInvoiceStatus(
  workspaceId: string,
  params: { invoiceId?: string; dealTitle?: string; contactName?: string; targetStatus: "DRAFT" | "ISSUED" }
) {
  const invoice = await findInvoiceInWorkspace(workspaceId, params);
  if (!invoice) {
    return "Couldn't find an invoice for that deal/contact.";
  }

  if (invoice.status === params.targetStatus) {
    return `Invoice ${invoice.number} is already ${params.targetStatus}.`;
  }
  if (invoice.status === "DRAFT") {
    return `Invoice ${invoice.number} is already at the earliest reversible state.`;
  }
  if (invoice.status === "ISSUED" && params.targetStatus !== "DRAFT") {
    return `Invoice ${invoice.number} can only be reversed back to DRAFT from ISSUED.`;
  }

  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      status: params.targetStatus,
      paidAt: params.targetStatus === "DRAFT" ? null : invoice.paidAt,
      issuedAt: params.targetStatus === "DRAFT" ? null : invoice.issuedAt || new Date(),
    },
  });
  if (invoice.status === "PAID") {
    await db.deal.update({
      where: { id: invoice.dealId },
      data: { stage: "INVOICED", stageChangedAt: new Date() },
    });
  }
  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Invoice status reversed",
      content: `Invoice ${invoice.number} moved from ${invoice.status} to ${params.targetStatus}.`,
      dealId: invoice.dealId,
      contactId: invoice.deal.contactId,
    },
  });
  await recordWorkspaceAuditEventForCurrentActor({
    workspaceId,
    action: "invoice.status_reversed",
    entityType: "invoice",
    entityId: invoice.id,
    metadata: {
      invoiceNumber: invoice.number,
      dealId: invoice.dealId,
      previousStatus: invoice.status,
      nextStatus: params.targetStatus,
      source: "chat-actions.runReverseInvoiceStatus",
    },
  });
  return `Reversed invoice ${invoice.number} to ${params.targetStatus}.`;
}

export async function runSendInvoiceReminder(
  workspaceId: string,
  params: { invoiceId?: string; dealTitle?: string; contactName?: string; channel?: "auto" | "email" | "sms" }
) {
  const invoice = await findInvoiceInWorkspace(workspaceId, params);
  if (!invoice) {
    return "Couldn't find an invoice for that deal/contact.";
  }

  const contact = invoice.deal.contact;
  const amount = Number(invoice.total || 0).toFixed(2);
  const subject = `Invoice reminder: ${invoice.number}`;
  const body = `Hi ${contact.name}, just a reminder that invoice ${invoice.number} for $${amount} is still outstanding. Please let us know if you have any questions.`;
  const channel = params.channel || "auto";

  if ((channel === "email" || channel === "auto") && contact.email) {
    return runSendEmail(workspaceId, {
      contactName: contact.name,
      subject,
      body,
      enforceCustomerContactMode: true,
    });
  }

  if ((channel === "sms" || channel === "auto") && contact.phone) {
    return runSendSms(workspaceId, {
      contactName: contact.name,
      message: `Reminder: invoice ${invoice.number} for $${amount} is still outstanding. Let us know if you need anything.`,
      enforceCustomerContactMode: true,
    });
  }

  return `Invoice ${invoice.number} has no usable customer contact channel for a reminder.`;
}

export async function runGetInvoiceStatusAction(
  workspaceId: string,
  params: { invoiceId?: string; dealTitle?: string; contactName?: string }
) {
  const invoice = await findInvoiceInWorkspace(workspaceId, params);
  if (!invoice) {
    return "Couldn't find an invoice for that deal/contact.";
  }

  const { getInvoiceSyncStatus } = await import("./accounting-actions");
  const syncStatus = await getInvoiceSyncStatus(invoice.id);
  return [
    `Invoice ${invoice.number}`,
    `Status: ${invoice.status}`,
    `Deal: ${invoice.deal.title}`,
    `Contact: ${invoice.deal.contact.name}`,
    `Total: $${Number(invoice.total || 0).toFixed(2)}`,
    `Accounting sync: ${syncStatus?.synced ? `synced via ${syncStatus.provider}` : "not synced / accounting not connected"}`,
  ].join("\n");
}

export async function runUpdateInvoiceFields(
  workspaceId: string,
  params: {
    invoiceId?: string;
    dealTitle?: string;
    contactName?: string;
    number?: string;
    lineItems?: Array<{ desc: string; price: number; qty?: number }>;
    subtotal?: number;
    tax?: number;
    total?: number;
    issuedAtISO?: string | null;
  }
) {
  const invoice = await findInvoiceInWorkspace(workspaceId, params);
  if (!invoice) {
    return "Couldn't find an invoice for that deal/contact.";
  }

  if (invoice.status === "VOID") {
    return `Invoice ${invoice.number} is void and can't be edited.`;
  }

  if (invoice.status === "PAID") {
    return `Invoice ${invoice.number} is already paid. Reverse the status before editing it.`;
  }

  const nextLineItems = params.lineItems?.length
    ? params.lineItems.map((item) => ({
        desc: item.desc,
        price: Number(item.price),
        qty: item.qty ?? 1,
      }))
    : Array.isArray(invoice.lineItems)
      ? (invoice.lineItems as Array<Record<string, unknown>>)
          .filter((item) => !!item && typeof item === "object")
          .map((item) => ({
            desc: typeof item.desc === "string" ? item.desc : "Item",
            price: Number(item.price ?? 0),
            qty: Number(item.qty ?? 1),
          }))
      : [];

  const computedSubtotal = nextLineItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
  const inferredSubtotal = params.subtotal ?? computedSubtotal ?? Number(invoice.subtotal);
  const nextTax = params.tax ?? Number((inferredSubtotal * 0.1).toFixed(2));
  const nextTotal = params.total ?? Number((inferredSubtotal + nextTax).toFixed(2));
  const nextNumber = params.number?.trim() || invoice.number;
  const nextIssuedAt =
    params.issuedAtISO === undefined
      ? invoice.issuedAt
      : params.issuedAtISO === null
        ? null
        : new Date(params.issuedAtISO);

  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      number: nextNumber,
      lineItems: JSON.parse(JSON.stringify(nextLineItems)),
      subtotal: inferredSubtotal,
      tax: nextTax,
      total: nextTotal,
      issuedAt: nextIssuedAt,
    },
  });

  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Invoice updated",
      content: `Updated invoice ${invoice.number}${nextNumber !== invoice.number ? ` to ${nextNumber}` : ""}.`,
      dealId: invoice.dealId,
      contactId: invoice.deal.contactId,
    },
  });
  await recordWorkspaceAuditEventForCurrentActor({
    workspaceId,
    action: "invoice.updated",
    entityType: "invoice",
    entityId: invoice.id,
    metadata: {
      invoiceNumber: invoice.number,
      dealId: invoice.dealId,
      nextInvoiceNumber: nextNumber,
      subtotal: inferredSubtotal,
      tax: nextTax,
      total: nextTotal,
      lineItemCount: nextLineItems.length,
      source: "chat-actions.runUpdateInvoiceFields",
    },
  });

  revalidatePath("/crm", "layout");
  return `Updated invoice ${nextNumber} for "${invoice.deal.title}".`;
}

export async function runVoidInvoice(
  workspaceId: string,
  params: { invoiceId?: string; dealTitle?: string; contactName?: string }
) {
  const invoice = await findInvoiceInWorkspace(workspaceId, params);
  if (!invoice) {
    return "Couldn't find an invoice for that deal/contact.";
  }

  if (invoice.status === "VOID") {
    return `Invoice ${invoice.number} is already void.`;
  }

  if (invoice.status === "PAID") {
    return `Invoice ${invoice.number} is paid. Reverse it out of PAID before voiding it.`;
  }

  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      status: "VOID",
      paidAt: null,
    },
  });

  if (invoice.deal.stage === "INVOICED") {
    await db.deal.update({
      where: { id: invoice.dealId },
      data: { stage: "CONTACTED", stageChangedAt: new Date() },
    });
  }

  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Invoice voided",
      content: `Invoice ${invoice.number} was voided.`,
      dealId: invoice.dealId,
      contactId: invoice.deal.contactId,
    },
  });
  await recordWorkspaceAuditEventForCurrentActor({
    workspaceId,
    action: "invoice.voided",
    entityType: "invoice",
    entityId: invoice.id,
    metadata: {
      invoiceNumber: invoice.number,
      dealId: invoice.dealId,
      previousStatus: invoice.status,
      source: "chat-actions.runVoidInvoice",
    },
  });

  revalidatePath("/crm", "layout");
  return `Voided invoice ${invoice.number} for "${invoice.deal.title}".`;
}

function findTaskByTitle(
  tasks: Array<{ id: string; title: string; completed: boolean }>,
  query: string
) {
  const normalized = query.toLowerCase().trim();
  const exact = tasks.find((task) => task.title.toLowerCase().trim() === normalized);
  if (exact) return exact;
  const contains = tasks.find((task) => task.title.toLowerCase().includes(normalized));
  if (contains) return contains;
  return null;
}

export async function runCompleteTaskByTitle(workspaceId: string, title: string) {
  try {
    const tasks = await getTasks({ workspaceId, completed: false, limit: 100 });
    const task = findTaskByTitle(tasks, title);
    if (!task) return `Couldn't find an open task matching "${title}".`;
    await completeTask(task.id);
    return `Completed task "${task.title}".`;
  } catch (err) {
    return `Error completing task: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export async function runDeleteTaskByTitle(workspaceId: string, title: string) {
  try {
    const tasks = await getTasks({ workspaceId, limit: 100 });
    const task = findTaskByTitle(tasks, title);
    if (!task) return `Couldn't find a task matching "${title}".`;
    await deleteTask(task.id);
    return `Deleted task "${task.title}".`;
  } catch (err) {
    return `Error deleting task: ${err instanceof Error ? err.message : String(err)}`;
  }
}

export async function runUpdateContactFields(
  workspaceId: string,
  params: {
    contactName: string;
    newName?: string;
    email?: string;
    phone?: string;
    address?: string;
    company?: string;
  }
) {
  try {
    const contacts = await searchContacts(workspaceId, params.contactName);
    if (!contacts.length) return `Couldn't find a contact matching "${params.contactName}".`;

    const contact = contacts[0];
    const updates = {
      contactId: contact.id,
      ...(params.newName?.trim() ? { name: params.newName.trim() } : {}),
      ...(params.email !== undefined ? { email: params.email.trim() } : {}),
      ...(params.phone !== undefined ? { phone: params.phone.trim() } : {}),
      ...(params.address !== undefined ? { address: params.address.trim() } : {}),
      ...(params.company !== undefined ? { company: params.company.trim() } : {}),
    };

    if (Object.keys(updates).length === 1) {
      return "No contact changes were provided.";
    }

    const { updateContact } = await import("./contact-actions");
    const result = await updateContact(updates);
    if (!result.success) {
      return `Failed to update ${contact.name}: ${result.error ?? "Unknown error."}`;
    }

    return `Updated ${contact.name}.`;
  } catch (err) {
    return `Error updating contact: ${err instanceof Error ? err.message : String(err)}`;
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
  params: { contactName: string; message: string; enforceCustomerContactMode?: boolean }
): Promise<string> {
  try {
    const modeBlock = await getCustomerContactGuardResult(
      workspaceId,
      "text",
      `SMS to ${params.contactName}: "${params.message}"`,
      params.enforceCustomerContactMode
    );
    if (modeBlock) return modeBlock;

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
      select: { twilioPhoneNumber: true, twilioSubaccountId: true, twilioSubaccountAuthToken: true, name: true },
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
    const { getWorkspaceTwilioClient } = await import("@/lib/twilio");
    const twilioClient = getWorkspaceTwilioClient(workspace);
    if (!twilioClient) {
      return `Twilio is configured on this workspace, but no usable messaging client is available right now.`;
    }
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
  params: { 
    contactName: string; 
    subject: string; 
    body: string;
    workspaceAlias?: string;
    workspaceName?: string;
    ownerEmail?: string;
    enforceCustomerContactMode?: boolean;
  }
): Promise<string> {
  try {
    const modeBlock = await getCustomerContactGuardResult(
      workspaceId,
      "email",
      `Email to ${params.contactName} with subject "${params.subject}"`,
      params.enforceCustomerContactMode
    );
    if (modeBlock) return modeBlock;

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
    const contactEmail = contact.email;

    const bodyHash = crypto.createHash("sha256").update(params.body).digest("hex");

    const idem = await runIdempotent<{ returnMessage: string }>({
      actionType: "EMAIL_SEND",
      bucketAt: new Date(),
      parts: [
        workspaceId,
        contact.id,
        params.subject.trim().toLowerCase(),
        bodyHash,
        params.workspaceAlias ?? "",
        params.ownerEmail ?? "",
      ],
      resultFactory: async () => {
        // Rest of the email sending logic...
        const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });
        const _senderName = workspace?.name ?? "Earlymark";

        let delivered = false;
        const resendKey = process.env.RESEND_API_KEY;
        const fromDomain = process.env.RESEND_FROM_DOMAIN;

        // LOGIC START
        let fromAddress = process.env.RESEND_FROM_EMAIL || "noreply@earlymark.ai";
        let replyToAddress = undefined;
        let bccAddress = undefined;

        // If this is an Agent conversation (alias is provided)
        if (params.workspaceAlias && params.workspaceName) {
          // 1. Construct the dynamic address
          // Use the hardcoded subdomain: @agent.earlymark.ai
          const agentEmail = `${params.workspaceAlias}@agent.earlymark.ai`;

          // 2. Set the 'From' header with a friendly name
          fromAddress = `"${params.workspaceName} Assistant" <${agentEmail}>`;

          // 3. Set 'Reply-To' to the SAME address so replies hit our webhook
          replyToAddress = agentEmail;

          // 4. Set BCC to the owner so they have visibility
          if (params.ownerEmail) {
            bccAddress = params.ownerEmail;
          }
        }
        // LOGIC END

        if (resendKey && fromDomain) {
          const { Resend } = await import("resend");
          const resend = new Resend(resendKey);
          const { error } = await resend.emails.send({
            from: fromAddress,
            to: [contactEmail],
            subject: params.subject,
            text: params.body,
            replyTo: replyToAddress,
            bcc: bccAddress,
          });
          if (error) {
            logger.error("Resend send email failed", { component: "chat-actions", action: "runSendEmailAction", workspaceId, contactId: contact.id }, error as Error);
            return { returnMessage: `Failed to send email to ${contact.name}: ${error.message}` };
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
          return { returnMessage: `Email sent to ${contact.name} (${contactEmail}). Subject: "${params.subject}".` };
        }
        return {
          returnMessage: `Email logged to ${contact.name} (${contactEmail}) but not delivered (Resend not configured). Subject: "${params.subject}".`,
        };
      },
    });

    if (!idem.result?.returnMessage) {
      return `Error sending email: Idempotency result missing`;
    }
    return idem.result.returnMessage;
  } catch (err) {
    return `Error sending email: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * AI Tool Action: Initiate an outbound phone call to a contact via LiveKit voice agent.
 * Routes the call through the Twilio SIP trunk connected to the LiveKit agent microservice.
 *
 * IMPROVED: Graceful handling of name mismatches with fuzzy matching suggestions
 */
export async function runMakeCall(
  workspaceId: string,
  params: { contactName: string; purpose?: string; enforceCustomerContactMode?: boolean }
): Promise<string> {
  try {
    const modeBlock = await getCustomerContactGuardResult(
      workspaceId,
      "call",
      `Call ${params.contactName}${params.purpose ? ` about ${params.purpose}` : ""}`,
      params.enforceCustomerContactMode
    );
    if (modeBlock) return modeBlock;

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

    // Look up the workspace's Twilio number for caller ID
    const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { twilioPhoneNumber: true } });
    const fromNumber = workspace?.twilioPhoneNumber;
    if (!fromNumber) {
      return `No phone number configured for this workspace. Set up a Twilio number in workspace settings first.`;
    }

    // Log the outbound call as an activity — LiveKit voice agent handles the call via SIP
    await logActivity({
      type: "CALL",
      title: `Outbound call to ${contact.name}`,
      content: params.purpose ?? "Call placed by AI assistant",
      contactId: contact.id,
    });

    return `📞 Calling ${contact.name} (${contact.phone}) via LiveKit voice agent...`;
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
      const direction =
        (m.metadata as Record<string, unknown> | null)?.direction === "outbound" ? "You" : contact.name;
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

export async function runListRecentCrmChanges(
  workspaceId: string,
  limit: number = 10
): Promise<string> {
  try {
    const activities = await db.activity.findMany({
      where: {
        OR: [
          { deal: { workspaceId } },
          { contact: { workspaceId } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: Math.max(1, Math.min(limit, 20)),
      include: {
        deal: { select: { title: true } },
        contact: { select: { name: true } },
        user: { select: { name: true } },
      },
    });

    if (!activities.length) {
      return "No recent CRM changes were found.";
    }

    return "Recent CRM changes:\n" + activities.map((activity) => {
      const subject = activity.deal?.title || activity.contact?.name || "general CRM";
      const actor = activity.user?.name ? ` by ${activity.user.name}` : "";
      return `- ${activity.title} on ${subject}${actor} (${formatTimeAgo(activity.createdAt)})`;
    }).join("\n");
  } catch (err) {
    return `Error loading recent CRM changes: ${err instanceof Error ? err.message : String(err)}`;
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
      link: params.link || "/crm/schedule",
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
    const deals = await getDeals(workspaceId, undefined, { unbounded: true });
    const deal = findDealByTitle(deals, params.dealTitle.trim());
    if (!deal) {
      const suggestions = deals.slice(0, 5).map(d => `"${d.title}"`).join(", ");
      return {
        success: false,
        message: `Couldn't find a job matching "${params.dealTitle}".${deals.length > 0 ? ` Current jobs: ${suggestions}` : " No jobs yet."}`,
      };
    }

    // Find the team member in this workspace
    const { member, members } = await resolveTeamMember(workspaceId, params.teamMemberName);

    if (!members.length) {
      return { success: false, message: "No team members found in this workspace." };
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

    revalidatePath("/crm", "layout");
    revalidatePath("/crm/deals");
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

export async function runBulkMoveDeals(
  workspaceId: string,
  params: { dealIds: string[]; newStage: string }
): Promise<string> {
  const resolvedStage = resolveStage(params.newStage.trim());
  if (!resolvedStage) {
    return `Unknown stage "${params.newStage}".`;
  }

  const deals = await getDealsByIds(workspaceId, params.dealIds);
  if (!deals.length) {
    return "No matching jobs were found for the selected IDs.";
  }

  const results: Array<{ id: string; title: string; status: "success" | "skipped" | "blocked"; reason?: string }> = [];
  for (const deal of deals) {
    const currentStage = PRISMA_STAGE_TO_CHAT_STAGE[deal.stage] ?? "new";
    if (currentStage === resolvedStage) {
      results.push({ id: deal.id, title: deal.title, status: "skipped", reason: "Already in that stage." });
      continue;
    }

    const result = await updateDealStage(deal.id, resolvedStage);
    if (!result.success) {
      results.push({ id: deal.id, title: deal.title, status: "blocked", reason: result.error ?? "Stage change failed." });
      continue;
    }

    await logActivity({
      type: "NOTE",
      title: `Bulk moved to ${resolvedStage}`,
      content: `Bulk stage change applied by CRM chatbot.`,
      dealId: deal.id,
      contactId: deal.contactId ?? undefined,
    });
    results.push({ id: deal.id, title: deal.title, status: "success" });
  }

  revalidatePath("/crm", "layout");
  revalidatePath("/crm/deals");
  return formatBulkOperationSummary(`Bulk move to ${resolvedStage}`, results);
}

export async function runBulkAssignDeals(
  workspaceId: string,
  params: { dealIds: string[]; teamMemberName: string }
): Promise<string> {
  const deals = await getDealsByIds(workspaceId, params.dealIds);
  if (!deals.length) {
    return "No matching jobs were found for the selected IDs.";
  }

  const { member, members } = await resolveTeamMember(workspaceId, params.teamMemberName);
  if (!member) {
    const memberList = members.map((m) => m.name || m.email).join(", ");
    return `No team member matching "${params.teamMemberName}". Available: ${memberList}`;
  }

  const results: Array<{ id: string; title: string; status: "success" | "skipped" | "blocked"; reason?: string }> = [];
  for (const deal of deals) {
    if (deal.assignedToId === member.id) {
      results.push({ id: deal.id, title: deal.title, status: "skipped", reason: "Already assigned to that team member." });
      continue;
    }

    const result = await updateDealAssignedTo(deal.id, member.id);
    if (!result.success) {
      results.push({ id: deal.id, title: deal.title, status: "blocked", reason: result.error ?? "Assignment failed." });
      continue;
    }

    await logActivity({
      type: "NOTE",
      title: `Bulk assigned to ${member.name || member.email}`,
      content: "Bulk assignment applied by CRM chatbot.",
      dealId: deal.id,
      contactId: deal.contactId ?? undefined,
    });
    results.push({ id: deal.id, title: deal.title, status: "success" });
  }

  revalidatePath("/crm", "layout");
  revalidatePath("/crm/deals");
  return formatBulkOperationSummary(`Bulk assignment to ${member.name || member.email}`, results);
}

export async function runBulkSetDealDisposition(
  workspaceId: string,
  params: { dealIds: string[]; disposition: "lost" | "deleted" | "archived" }
): Promise<string> {
  const deals = await getDealsByIds(workspaceId, params.dealIds);
  if (!deals.length) {
    return "No matching jobs were found for the selected IDs.";
  }

  const targetStage = params.disposition;
  const results: Array<{ id: string; title: string; status: "success" | "skipped" | "blocked"; reason?: string }> = [];
  for (const deal of deals) {
    const currentStage = PRISMA_STAGE_TO_CHAT_STAGE[deal.stage] ?? "new";
    if (currentStage === targetStage) {
      results.push({ id: deal.id, title: deal.title, status: "skipped", reason: "Already in that state." });
      continue;
    }

    const result = await updateDealStage(deal.id, targetStage);
    if (!result.success) {
      results.push({ id: deal.id, title: deal.title, status: "blocked", reason: result.error ?? "Disposition change failed." });
      continue;
    }

    await logActivity({
      type: "NOTE",
      title: `Bulk marked as ${targetStage}`,
      content: "Bulk disposition change applied by CRM chatbot.",
      dealId: deal.id,
      contactId: deal.contactId ?? undefined,
    });
    results.push({ id: deal.id, title: deal.title, status: "success" });
  }

  revalidatePath("/crm", "layout");
  revalidatePath("/crm/deals");
  return formatBulkOperationSummary(`Bulk mark as ${targetStage}`, results);
}

export async function runBulkCreateDealReminder(
  workspaceId: string,
  params: { dealIds: string[]; title: string; message: string; scheduledAtISO?: string }
): Promise<string> {
  const deals = await getDealsByIds(workspaceId, params.dealIds);
  if (!deals.length) {
    return "No matching jobs were found for the selected IDs.";
  }

  const dueAt = params.scheduledAtISO ? new Date(params.scheduledAtISO) : undefined;
  const results: Array<{ id: string; title: string; status: "success" | "skipped" | "blocked"; reason?: string }> = [];
  for (const deal of deals) {
    const taskResult = await createTask({
      title: params.title,
      description: `${params.message}\n\nRelated job: ${deal.title}`,
      dueAt: dueAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
      dealId: deal.id,
      contactId: deal.contactId ?? undefined,
    });

    if (!taskResult.success) {
      results.push({ id: deal.id, title: deal.title, status: "blocked", reason: taskResult.error ?? "Reminder creation failed." });
      continue;
    }

    results.push({ id: deal.id, title: deal.title, status: "success" });
  }

  revalidatePath("/crm", "layout");
  revalidatePath("/crm/tasks");
  return formatBulkOperationSummary(`Bulk reminder "${params.title}"`, results);
}

export async function runRevertDealStageMove(
  workspaceId: string,
  params: { dealId: string }
): Promise<string> {
  const deal = await db.deal.findFirst({
    where: { id: params.dealId, workspaceId },
    select: { id: true, title: true, stage: true, metadata: true, contactId: true },
  });
  if (!deal) return "Deal not found.";

  const meta = (deal.metadata as Record<string, unknown>) ?? {};
  const previousStage = typeof meta.previousStage === "string" ? meta.previousStage : "";
  const resolvedStage = PRISMA_STAGE_TO_CHAT_STAGE[previousStage] ?? previousStage.toLowerCase();
  if (!resolvedStage) {
    return `No reversible stage change is recorded for "${deal.title}".`;
  }

  const result = await updateDealStage(deal.id, resolvedStage);
  if (!result.success) {
    return `Failed to revert "${deal.title}": ${result.error ?? "Unknown error."}`;
  }

  await logActivity({
    type: "NOTE",
    title: "Stage move reverted",
    content: `Reverted stage move back to ${resolvedStage}.`,
    dealId: deal.id,
    contactId: deal.contactId ?? undefined,
  });
  return `Reverted "${deal.title}" back to ${resolvedStage}.`;
}

export async function runUnassignDeal(
  workspaceId: string,
  params: { dealId: string }
): Promise<string> {
  const deal = await db.deal.findFirst({
    where: { id: params.dealId, workspaceId },
    select: { id: true, title: true, assignedToId: true, contactId: true },
  });
  if (!deal) return "Deal not found.";
  if (!deal.assignedToId) return `"${deal.title}" is not currently assigned.`;

  const result = await updateDealAssignedTo(deal.id, null);
  if (!result.success) {
    return `Failed to unassign "${deal.title}": ${result.error ?? "Unknown error."}`;
  }

  await logActivity({
    type: "NOTE",
    title: "Assignment removed",
    content: "Team member assignment removed by CRM chatbot.",
    dealId: deal.id,
    contactId: deal.contactId ?? undefined,
  });
  return `Unassigned "${deal.title}".`;
}

export async function runRestoreDeal(
  workspaceId: string,
  params: { dealId: string }
): Promise<string> {
  const deal = await db.deal.findFirst({
    where: { id: params.dealId, workspaceId },
    select: { id: true, title: true, stage: true, metadata: true, contactId: true },
  });
  if (!deal) return "Deal not found.";

  if (!["LOST", "DELETED", "ARCHIVED"].includes(deal.stage)) {
    return `"${deal.title}" is not in a restorable state.`;
  }

  const meta = (deal.metadata as Record<string, unknown>) ?? {};
  const previousStage = typeof meta.previousStage === "string" ? meta.previousStage : "NEW";
  const resolvedStage = PRISMA_STAGE_TO_CHAT_STAGE[previousStage] ?? "new";
  const result = await updateDealStage(deal.id, resolvedStage);
  if (!result.success) {
    return `Failed to restore "${deal.title}": ${result.error ?? "Unknown error."}`;
  }

  await logActivity({
    type: "NOTE",
    title: "Deal restored",
    content: `Restored from ${deal.stage} to ${resolvedStage}.`,
    dealId: deal.id,
    contactId: deal.contactId ?? undefined,
  });
  return `Restored "${deal.title}" to ${resolvedStage}.`;
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
          data: { stage: previousStage as DealStage },
        });
        await db.activity.delete({ where: { id: lastActivity.id } });
        revalidatePath("/crm", "layout");
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
      revalidatePath("/crm", "layout");
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
): Promise<{
  displayMessage: string;
  ticketId: string;
  SYSTEM_CONTEXT_SIGNAL: string;
}> {
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
        twilioSipTrunkSid: true,
      }
    })
  ]);

  if (!user || !workspace) {
    return {
      displayMessage: "I'm having trouble accessing your account details. Please try again or contact support directly.",
      ticketId: "unavailable",
      SYSTEM_CONTEXT_SIGNAL: "[STATE: TICKET_CREATED] [TICKET_ID: unavailable] If the user's next message is a detail/correction, automatically call 'appendTicketNote' with this ID.",
    };
  }

  const supportEmail = process.env.SUPPORT_EMAIL_TO || "support@earlymark.ai";
  const resendKey = process.env.RESEND_API_KEY;
  const fromDomain = process.env.RESEND_FROM_DOMAIN || "earlymark.ai";
  const fromAddress = process.env.SUPPORT_EMAIL_FROM || `support@${fromDomain}`;

  // Log support request to activity feed
  const supportTicket = await db.activity.create({
    data: {
      type: "NOTE",
      title: `Chatbot Support Request: ${subject}`,
      content: `Priority: ${priority}\n\nOriginal message: "${message}"\n\nUser: ${user.email}\nPhone: ${user.phone || "Not provided"}\nWorkspace: ${workspace.name}\nAI Agent Number: ${workspace.twilioPhoneNumber || "Not configured"}\nTwilio Account: ${workspace.twilioSubaccountId ? "Active" : "Not setup"}\nVoice Agent: ${workspace.twilioSipTrunkSid ? "Active (LiveKit)" : "Not setup"}`,
    },
  });

  if (resendKey) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: `Earlymark Support <${fromAddress}>`,
        to: [supportEmail],
        replyTo: user.email ?? undefined,
        subject: `[Chat Support:${priority.toUpperCase()}] ${subject}`,
        text: [
          `Priority: ${priority}`,
          `Ticket ID: ${supportTicket.id}`,
          `User: ${user.name || "Unknown user"}`,
          `Email: ${user.email || "Unknown email"}`,
          `Phone: ${user.phone || "Not provided"}`,
          `Workspace: ${workspace.name}`,
          `Tracey number: ${workspace.twilioPhoneNumber || "Not configured"}`,
          `Twilio Account: ${workspace.twilioSubaccountId ? "Active" : "Not setup"}`,
          `Voice Agent: ${workspace.twilioSipTrunkSid ? "Active (LiveKit)" : "Not setup"}`,
          "",
          message,
        ].join("\n"),
      });
    } catch (error) {
      logger.error("Failed to email chatbot support request", {
        component: "chat-actions",
        action: "handleSupportRequest",
        ticketId: supportTicket.id,
      }, error as Error);
    }
  }

  const signal = `[STATE: TICKET_CREATED] [TICKET_ID: ${supportTicket.id}] If the user's next message is a detail/correction, automatically call 'appendTicketNote' with this ID.`;
  const base = {
    ticketId: supportTicket.id,
    SYSTEM_CONTEXT_SIGNAL: signal,
  };

  // Categorize and provide immediate help
  if (lowerMessage.includes("phone number") || lowerMessage.includes("twilio") || lowerMessage.includes("ai agent")) {
    return {
      ...base,
      displayMessage: `Ticket #${supportTicket.id} created for phone/Tracey support. Here's what I can see:\n\n📱 Tracey Number: ${workspace.twilioPhoneNumber || "Not configured"}\n🔧 Twilio Account: ${workspace.twilioSubaccountId ? "Active" : "Not setup"}\n🤖 Voice Agent: ${workspace.twilioSipTrunkSid ? "Active (LiveKit)" : "Not setup"}\n\nIf your Tracey number isn't working, this usually means setup didn't complete during onboarding. Our support team will contact you within 24 hours.\n\nFor immediate help: call 1300 EARLYMARK (Mon-Fri 9am-5pm) or email support@earlymark.ai`,
    };
  }

  if (lowerMessage.includes("billing") || lowerMessage.includes("payment") || lowerMessage.includes("subscription")) {
    return {
      ...base,
      displayMessage: `Ticket #${supportTicket.id} created for billing support. Our billing team will review your account and contact you within 24 hours.\n\nFor immediate billing questions:\n• Check your Billing settings in the dashboard\n• Email support@earlymark.ai\n• Call 1300 EARLYMARK and ask for billing`,
    };
  }

  if (
    lowerMessage.includes("feedback") ||
    lowerMessage.includes("feature") ||
    lowerMessage.includes("request") ||
    lowerMessage.includes("suggestion") ||
    lowerMessage.includes("complaint")
  ) {
    return {
      ...base,
      displayMessage: `Thanks — ticket #${supportTicket.id} created for your product feedback. We review every feedback ticket and will follow up at ${user.email} if we need more detail or have an update.\n\nIf you'd like, send more context now and I'll attach it to the same ticket.`,
    };
  }

  // General support
  return {
    ...base,
    displayMessage: `Ticket #${supportTicket.id} created with subject "${subject}" (${priority} priority).\n\nOur support team will contact you within 24 hours at ${user.email}. For urgent issues, call 1300 EARLYMARK (Mon-Fri 9am-5pm AEST).\n\nIf you'd like, add more details now and I'll attach them to this ticket.`,
  };
}

/**
 * Extract support subject from message
 */
function extractSupportSubject(message: string): string {
  if (message.includes("phone") || message.includes("twilio") || message.includes("ai agent")) return "Phone/AI Agent Issue";
  if (message.includes("billing") || message.includes("payment") || message.includes("subscription")) return "Billing Question";
  if (message.includes("feedback") || message.includes("feature") || message.includes("request") || message.includes("suggestion") || message.includes("complaint")) return "Product Feedback";
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

