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

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();

        // Twilio UsageTrigger callback fields
        const accountSid = formData.get("AccountSid")?.toString() || "";
        const currentValue = formData.get("CurrentValue")?.toString() || "0";
        const triggerValue = formData.get("TriggerValue")?.toString() || "0";
        const usageCategory = formData.get("UsageCategory")?.toString() || "";

        if (!accountSid) {
            return NextResponse.json({ error: "Missing AccountSid" }, { status: 400 });
        }

        console.log(`[twilio-usage] Trigger fired for ${accountSid}: $${currentValue} (limit: $${triggerValue}, category: ${usageCategory})`);

        // Find the workspace by subaccount ID
        const workspace = await db.workspace.findFirst({
            where: { twilioSubaccountId: accountSid },
            select: { id: true, name: true, voiceEnabled: true },
        });

        if (!workspace) {
            console.warn(`[twilio-usage] No workspace found for account: ${accountSid}`);
            return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
        }

        // Already disabled? Skip.
        if (workspace.voiceEnabled === false) {
            console.log(`[twilio-usage] Voice already disabled for workspace ${workspace.id}`);
            return NextResponse.json({ ok: true, alreadyDisabled: true });
        }

        // Disable voice
        await db.workspace.update({
            where: { id: workspace.id },
            data: { voiceEnabled: false },
        });

        // Log activity
        await db.activity.create({
            data: {
                type: "NOTE",
                title: "⚠️ Voice Disabled — Daily Spend Limit Reached",
                content: `Voice calls have been automatically paused for ${workspace.name || "this workspace"}. Daily Twilio spend reached $${currentValue} (limit: $${triggerValue}). Voice will re-enable at the start of the next billing day. Contact support if this is unexpected.`,
            },
        });

        console.log(`[twilio-usage] Voice disabled for workspace ${workspace.id} (${workspace.name})`);

        return NextResponse.json({ ok: true, voiceDisabled: true });
    } catch (error) {
        console.error("[twilio-usage] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
