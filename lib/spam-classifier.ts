/**
 * Spam Classifier — classifies incoming SMS/email as lead or spam
 * ════════════════════════════════════════════════════════════════
 * Uses Gemini 2.0 Flash Lite for near-zero cost classification.
 *
 * Learning mechanism:
 *   When a user reports a false positive (real lead marked as spam),
 *   the system extracts PATTERNS from the misclassified message
 *   (e.g., "contains phone number + suburb name + job description")
 *   and stores them in BusinessKnowledge as TRUSTED_LEAD_PATTERN entries.
 *   These patterns are included in the classifier prompt on subsequent calls.
 */

import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────

export interface ClassifyResult {
    classification: "lead" | "spam";
    confidence: number;
    reason: string;
}

// ─── Classifier ─────────────────────────────────────────────────────

export async function classifyMessage(
    workspaceId: string,
    body: string,
    senderInfo?: string
): Promise<ClassifyResult> {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
        // Fail open: if no API key, assume it's a lead
        return { classification: "lead", confidence: 0, reason: "No AI key configured — skipping classification" };
    }

    // Fetch learned patterns for this workspace
    const learnedPatterns = await db.businessKnowledge.findMany({
        where: {
            workspaceId,
            category: "TRUSTED_LEAD_PATTERN" as any,
        },
        select: { ruleContent: true },
        take: 20,
    });

    const learnedContext = learnedPatterns.length > 0
        ? `\n\nThe following patterns have been confirmed as real leads by the business owner. Messages matching these patterns should be classified as "lead":\n${learnedPatterns.map((p) => `- ${p.ruleContent}`).join("\n")}`
        : "";

    const google = createGoogleGenerativeAI({ apiKey });

    const result = await generateObject({
        model: google("gemini-2.0-flash-lite"),
        system: `You are a spam classifier for a trade business CRM. Classify the incoming message as either "lead" (a genuine customer enquiry, job request, quote request, or lead notification from a platform like HiPages/Airtasker/ServiceSeeking) or "spam" (marketing, newsletters, promotions, scams, automated messages).

Rules:
- Messages from lead platforms (HiPages, Airtasker, ServiceSeeking, Bark) are ALWAYS "lead".
- Messages containing a phone number + job description are likely "lead".
- Generic marketing, newsletters, unsubscribe links → "spam".
- When in doubt, classify as "lead" (false negatives are worse than false positives).${learnedContext}`,
        prompt: `${senderInfo ? `From: ${senderInfo}\n` : ""}Message:\n${body}`,
        schema: z.object({
            classification: z.enum(["lead", "spam"]).describe("Whether this is a real lead or spam"),
            confidence: z.number().min(0).max(1).describe("Confidence score 0-1"),
            reason: z.string().describe("Brief reason for classification"),
        }),
    });

    return result.object;
}

// ─── Learning from False Positives ──────────────────────────────────

/**
 * When a user reports that a message was wrongly classified as spam,
 * extract what makes it a real lead and store the pattern.
 * This is NOT just whitelisting the sender — it learns the content pattern.
 */
export async function learnFromFalsePositive(
    workspaceId: string,
    messageBody: string,
    senderInfo?: string
): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
        return "No AI key — cannot learn";
    }

    const google = createGoogleGenerativeAI({ apiKey });

    const result = await generateObject({
        model: google("gemini-2.0-flash-lite"),
        system: `You are analyzing a message that was wrongly classified as spam. It is actually a real lead/customer enquiry. Extract a PATTERN RULE that describes what makes this message a legitimate lead — focus on content signals, not just the sender address.

Examples of good pattern rules:
- "Email contains a phone number, suburb name, and describes plumbing work"
- "Message mentions 'quote request' and includes a street address"
- "Email from a lead marketplace with subject containing 'New Lead'"
- "SMS contains a callback number and describes an emergency repair"

Do NOT just say "from sender X" — extract the content-based pattern.`,
        prompt: `${senderInfo ? `From: ${senderInfo}\n` : ""}Message:\n${messageBody}`,
        schema: z.object({
            pattern: z.string().describe("A content-based pattern rule that identifies messages like this as real leads"),
        }),
    });

    // Store the learned pattern
    await db.businessKnowledge.create({
        data: {
            workspaceId,
            category: "TRUSTED_LEAD_PATTERN" as any,
            ruleContent: result.object.pattern,
            source: "learned",
            metadata: {
                originalSender: senderInfo || null,
                learnedAt: new Date().toISOString(),
                sampleSnippet: messageBody.slice(0, 200),
            },
        },
    });

    return result.object.pattern;
}
