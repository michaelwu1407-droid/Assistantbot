import { db } from "@/lib/db";
import { findContactByPhone } from "@/lib/workspace-routing";
import { evaluateAutomations } from "@/actions/automation-actions";

/**
 * Post-Call CRM Sync
 * ===================
 * After a voice call ends, extract structured data from the call payload
 * and create/update Contact + Deal in the CRM.
 *
 * Design principles:
 * - No LLM calls (too slow/unreliable for a webhook)
 * - Use caller metadata + simple transcript heuristics
 * - Idempotent: re-running with the same callId won't duplicate
 * - Only runs for "normal" calls (not demo/inbound_demo)
 */

export interface PostCallPayload {
  callId: string;
  callType: string;
  callerPhone?: string;
  calledPhone?: string;
  callerName?: string;
  businessName?: string;
  transcriptText: string;
  transcriptTurns?: Array<{ role: string; text: string; createdAt: number }>;
  summary?: string;
  voiceCallId: string;
}

export interface PostCallSyncResult {
  contactId: string | null;
  dealId: string | null;
  contactCreated: boolean;
  dealCreated: boolean;
  skipped: boolean;
  reason?: string;
}

/**
 * Main entry point: sync a completed voice call into the CRM.
 */
export async function syncVoiceCallToCRM(
  workspaceId: string,
  payload: PostCallPayload,
): Promise<PostCallSyncResult> {
  // Only sync normal customer calls
  if (payload.callType !== "normal") {
    return { contactId: null, dealId: null, contactCreated: false, dealCreated: false, skipped: true, reason: "not a normal call" };
  }

  // Need a phone number to match/create contact
  if (!payload.callerPhone) {
    return { contactId: null, dealId: null, contactCreated: false, dealCreated: false, skipped: true, reason: "no caller phone" };
  }

  // Skip very short calls (< 3 turns = probably hang-up or wrong number)
  const turns = payload.transcriptTurns || [];
  const callerTurns = turns.filter((t) => t.role === "user");
  if (callerTurns.length < 2) {
    return { contactId: null, dealId: null, contactCreated: false, dealCreated: false, skipped: true, reason: "too short" };
  }

  // Check if a deal was already synced for this call (idempotency)
  const existingVoiceCall = await db.voiceCall.findUnique({
    where: { callId: payload.callId },
    select: { dealId: true },
  });
  if (existingVoiceCall?.dealId) {
    return { contactId: null, dealId: existingVoiceCall.dealId, contactCreated: false, dealCreated: false, skipped: true, reason: "already synced" };
  }

  // ── Step 1: Find or create Contact ──────────────────────────────
  let contactCreated = false;
  let contact = await findContactByPhone(workspaceId, payload.callerPhone);

  if (!contact) {
    const callerName = extractCallerName(payload);
    const newContact = await db.contact.create({
      data: {
        name: callerName,
        phone: payload.callerPhone,
        company: payload.businessName || null,
        workspaceId,
        metadata: { source: "voice_call", createdFromCall: payload.callId },
      },
    });
    contact = { id: newContact.id, name: newContact.name, phone: newContact.phone };
    contactCreated = true;
    console.log(`[post-call-sync] Created contact ${newContact.id} for ${callerName} (${payload.callerPhone})`);
  }

  // ── Step 2: Create Deal ─────────────────────────────────────────
  const extracted = extractDealInfo(payload);

  const deal = await db.deal.create({
    data: {
      title: extracted.title,
      value: 0, // Unknown until quote
      stage: "NEW",
      contactId: contact.id,
      workspaceId,
      source: "phone",
      metadata: {
        createdFromCall: payload.callId,
        voiceCallSummary: payload.summary || null,
        extractedNotes: extracted.notes || null,
        extractedAddress: extracted.address || null,
      },
      ...(extracted.address ? { address: extracted.address } : {}),
    },
  });
  console.log(`[post-call-sync] Created deal ${deal.id}: "${extracted.title}" for contact ${contact.id}`);

  // ── Step 3: Link VoiceCall to Contact + Deal ────────────────────
  await db.voiceCall.update({
    where: { callId: payload.callId },
    data: {
      contactId: contact.id,
      dealId: deal.id,
    },
  });

  // ── Step 4: Create activity log ─────────────────────────────────
  await db.activity.create({
    data: {
      type: "CALL",
      title: `New lead from voice call: ${extracted.title}`,
      content: payload.summary || `${contact.name} called about: ${extracted.title}`,
      description: (payload.transcriptText || "").slice(0, 2000),
      contactId: contact.id,
      dealId: deal.id,
    },
  });

  // ── Step 5: Fire automations (new_lead trigger) ─────────────────
  try {
    await evaluateAutomations(workspaceId, {
      type: "new_lead",
      dealId: deal.id,
      contactId: contact.id,
    });
  } catch (err) {
    console.error("[post-call-sync] Automation eval failed (non-fatal):", err);
  }

  return {
    contactId: contact.id,
    dealId: deal.id,
    contactCreated,
    dealCreated: true,
    skipped: false,
  };
}

// ─── Extraction Helpers ──────────────────────────────────────────────

/**
 * Extract a reasonable caller name from the payload + transcript.
 * Priority: payload.callerName > transcript greeting > phone number
 */
function extractCallerName(payload: PostCallPayload): string {
  // 1. Use payload name if it looks real (not "unknown" or empty)
  if (payload.callerName && !/^(unknown|caller|sip|tel)/i.test(payload.callerName)) {
    return payload.callerName;
  }

  // 2. Try to find name from early transcript turns
  const turns = payload.transcriptTurns || [];
  const earlyCallerTurns = turns
    .filter((t) => t.role === "user")
    .slice(0, 3);

  for (const turn of earlyCallerTurns) {
    const nameMatch = turn.text.match(
      /(?:(?:my name(?:'s| is)|this is|i'm|it's|i am)\s+)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    );
    if (nameMatch?.[1]) {
      return nameMatch[1].trim();
    }
  }

  // 3. Fall back to phone number
  return `Caller ${(payload.callerPhone || "").slice(-4)}`;
}

/**
 * Extract deal title and notes from the transcript.
 * Uses simple keyword matching on early caller turns to determine
 * what the call was about.
 */
function extractDealInfo(payload: PostCallPayload): {
  title: string;
  notes: string;
  address: string | null;
} {
  const turns = payload.transcriptTurns || [];
  const callerTurns = turns
    .filter((t) => t.role === "user")
    .map((t) => t.text)
    .slice(0, 6);

  const fullCallerText = callerTurns.join(" ").toLowerCase();
  const callerName = payload.callerName || "Caller";

  // Try to extract what they called about from early turns
  let topic = "";
  for (const text of callerTurns) {
    // "I need a quote for..." / "I'm looking for..." / "I've got a..."
    const topicMatch = text.match(
      /(?:need (?:a |some )?|looking (?:for |to )|want (?:to |a )|got (?:a |an |some )|calling about |enquir(?:ing|e) about |(?:quote|price) (?:for |on ))(.{5,80}?)(?:\.|$|,|\?)/i,
    );
    if (topicMatch?.[1]) {
      topic = topicMatch[1].trim();
      break;
    }
  }

  // If no explicit topic, summarize from keywords
  if (!topic) {
    const keywords = [
      "leak", "blocked", "drain", "toilet", "tap", "pipe", "hot water",
      "air con", "heater", "electrical", "lights", "switch", "roof",
      "gutter", "paint", "fence", "mow", "clean", "install", "repair",
      "replace", "fix", "broken", "emergency", "quote", "inspection",
    ];
    const found = keywords.filter((kw) => fullCallerText.includes(kw));
    if (found.length > 0) {
      topic = found.slice(0, 3).join(", ");
    }
  }

  // Build the deal title
  const title = topic
    ? `${callerName}: ${topic.charAt(0).toUpperCase()}${topic.slice(1)}`
    : `Inbound call from ${callerName}`;

  // Extract address if mentioned
  let address: string | null = null;
  for (const text of callerTurns) {
    // "I'm at 123 Smith Street" / "address is 45 King Road"
    const addressMatch = text.match(
      /(?:(?:i'm |i am |we're |we are )?(?:at|in|on|address (?:is|:))\s+)?(\d{1,5}\s+[A-Z][a-z]+(?:\s+[A-Z]?[a-z]+)*\s+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Way|Place|Pl|Court|Ct|Crescent|Cres|Boulevard|Blvd|Parade|Pde|Close|Cl|Terrace|Tce|Circuit|Cct)(?:\s*,?\s*[A-Z][a-z]+)?)/i,
    );
    if (addressMatch?.[1]) {
      address = addressMatch[1].trim();
      break;
    }
  }

  // Compile caller's key statements as notes
  const notes = callerTurns
    .filter((t) => t.length > 10)
    .slice(0, 4)
    .join("\n");

  return { title, notes, address };
}
