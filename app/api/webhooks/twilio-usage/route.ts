/**
 * Twilio Usage Trigger Webhook — /api/webhooks/twilio-usage
 * ══════════════════════════════════════════════════════════
 * Circuit breaker: When a workspace's daily Twilio spend exceeds
 * the threshold ($50), Twilio fires this webhook and we disable
 * voice for that subaccount to prevent runaway costs.
 *
 * The user sees the flag change in their Activity Feed.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runIdempotent } from "@/lib/idempotency";
import { verifyTwilioFormPost } from "@/lib/twilio/verify-signature";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const verification = await verifyTwilioFormPost(req);
        if (!verification.ok) {
            return new NextResponse("forbidden", { status: verification.status });
        }

        // Twilio UsageTrigger callback fields
        const accountSid = verification.params.AccountSid || "";
        const currentValue = verification.params.CurrentValue || "0";
        const triggerValue = verification.params.TriggerValue || "0";
        const usageCategory = verification.params.UsageCategory || "";
        const triggerSid = verification.params.Sid || "";

        if (!accountSid) {
            return NextResponse.json({ error: "Missing AccountSid" }, { status: 400 });
        }

        console.log(`[twilio-usage] Trigger fired for ${accountSid}: $${currentValue} (limit: $${triggerValue}, category: ${usageCategory})`);

        // Twilio retries the same UsageTrigger callback on transient failures.
        // Dedup by (TriggerSid OR account+category+day) so the activity log entry
        // and voice-disable side effect run at most once per logical event.
        const dayKey = new Date().toISOString().slice(0, 10);
        const dedupKey = triggerSid || `${accountSid}:${usageCategory}:${dayKey}`;

        const idempotency = await runIdempotent({
            actionType: "twilio.usage-trigger",
            parts: [dedupKey],
            bucketAt: new Date(),
            resultFactory: async () => {
                const workspace = await db.workspace.findFirst({
                    where: { twilioSubaccountId: accountSid },
                    select: { id: true, name: true, voiceEnabled: true },
                });

                if (!workspace) {
                    console.warn(`[twilio-usage] No workspace found for account: ${accountSid}`);
                    return { handled: false as const, reason: "workspace_not_found" };
                }

                if (workspace.voiceEnabled === false) {
                    console.log(`[twilio-usage] Voice already disabled for workspace ${workspace.id}`);
                    return { handled: true as const, alreadyDisabled: true };
                }

                await db.workspace.update({
                    where: { id: workspace.id },
                    data: { voiceEnabled: false },
                });

                await db.activity.create({
                    data: {
                        type: "NOTE",
                        title: "⚠️ Voice Disabled — Daily Spend Limit Reached",
                        content: `Voice calls have been automatically paused for ${workspace.name || "this workspace"}. Daily Twilio spend reached $${currentValue} (limit: $${triggerValue}). Voice will re-enable at the start of the next billing day. Contact support if this is unexpected.`,
                    },
                });

                console.log(`[twilio-usage] Voice disabled for workspace ${workspace.id} (${workspace.name})`);
                return { handled: true as const, voiceDisabled: true };
            },
            waitForCompletionMs: 4000,
        });

        if (!idempotency.created) {
            return NextResponse.json({ ok: true, deduped: true });
        }

        const result = idempotency.result;
        if (result?.handled === false) {
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }
        return NextResponse.json({ ok: true, ...(result ?? {}) });
    } catch (error) {
        console.error("[twilio-usage] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
