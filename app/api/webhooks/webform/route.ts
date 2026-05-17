/**
 * Webform Webhook — /api/webhooks/webform
 *
 * Accepts POST requests from contact forms embedded on the tradie's website.
 * Creates or finds a contact and opens a new lead (Deal) in the CRM tagged
 * with source = "website".
 *
 * Recommended embed flow:
 *   1. Add a hidden field `workspace_id` to your form (value = your workspace ID).
 *   2. Optional: add `secret` field matching WEBFORM_WEBHOOK_SECRET env var.
 *   3. Point your form's action URL (or fetch POST) to this endpoint.
 *
 * Accepted Content-Types: application/json, multipart/form-data, application/x-www-form-urlencoded
 *
 * Expected fields (all optional except workspace_id):
 *   workspace_id  — your workspace/business ID
 *   name          — customer full name
 *   email         — customer email
 *   phone         — customer phone
 *   message       — job description / enquiry text
 *   job_type      — type of work requested (e.g. "Leak repair")
 *   address       — job site address
 *   source        — override source label (default: "website")
 *   secret        — optional shared secret for verification
 *   redirect_url  — URL to redirect to after submission (for HTML form POST)
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { evaluateAutomations } from "@/actions/automation-actions";
import { saveTriageRecommendation, triageIncomingLead } from "@/lib/ai/triage";
import { scheduleLeadCallback } from "@/lib/lead-callback";
import { isWithinAllowedCallWindow } from "@/lib/call-window";
import { canAutoCallLead, type AutoCallBlockReason } from "@/lib/auto-call-eligibility";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const dynamic = "force-dynamic";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-workspace-id",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

async function parsePayload(req: NextRequest): Promise<Record<string, string>> {
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return await req.json();
    } catch {
      return {};
    }
  }

  // Form data (multipart or url-encoded)
  try {
    const formData = await req.formData();
    const result: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string") result[key] = value;
    }
    return result;
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await parsePayload(req);

    // Resolve workspace — prefer explicit workspace_id, fall back to subdomain header
    const workspaceId = body.workspace_id || req.headers.get("x-workspace-id") || "";
    if (!workspaceId) {
      return NextResponse.json({ error: "workspace_id is required" }, { status: 400, headers: corsHeaders() });
    }

    // Optional shared-secret verification
    const webhookSecret = process.env.WEBFORM_WEBHOOK_SECRET;
    if (webhookSecret && body.secret !== webhookSecret) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401, headers: corsHeaders() });
    }

    // Validate workspace exists
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true, name: true, settings: true, ownerId: true,
        autoCallLeads: true, autoCallDelaySec: true,
        voiceEnabled: true, agentMode: true, twilioPhoneNumber: true,
      },
    });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404, headers: corsHeaders() });
    }

    // Honeypot: bots fill this hidden field, real users don't see it.
    // Silently accept (200) so bots don't get signal we detected them.
    if ((body.company_website || "").trim()) {
      console.info(`[Webform webhook] honeypot tripped for workspace ${workspaceId} — silent accept`);
      return NextResponse.json({ success: true }, { headers: corsHeaders() });
    }

    const name = (body.name || body.full_name || body.customer_name || "Website Enquiry").trim();
    const email = (body.email || body.customer_email || "").toLowerCase().trim();
    const phone = (body.phone || body.mobile || body.customer_phone || "").trim();
    const message = (body.message || body.enquiry || body.description || "").trim();
    const jobType = (body.job_type || body.service_type || body.work_type || "").trim();
    const address = (body.address || body.location || body.site_address || "").trim();
    const source = (body.source || "website").trim();
    const redirectUrl = (body.redirect_url || "").trim();

    // Find or create contact
    let contact = email
      ? await db.contact.findFirst({ where: { workspaceId, email } })
      : null;

    if (!contact) {
      contact = await db.contact.create({
        data: {
          workspaceId,
          name,
          ...(email ? { email } : {}),
          ...(phone ? { phone } : {}),
        },
      });
    } else {
      // Update phone if not already set
      if (phone && !contact.phone) {
        await db.contact.update({ where: { id: contact.id }, data: { phone } });
      }
    }

    // Build deal title
    const title = jobType
      ? `${jobType} — ${name}`
      : message.length > 0
        ? `${name}: ${message.substring(0, 60)}${message.length > 60 ? "…" : ""}`
        : `Enquiry from ${name}`;

    // Create the deal / lead
    const deal = await db.deal.create({
      data: {
        workspaceId,
        contactId: contact.id,
        title,
        stage: "NEW",
        description: message || undefined,
        address: address || undefined,
        source,
      } as any,
    });

    // Log an activity
    await db.activity.create({
      data: {
        type: "NOTE",
        title: `Website enquiry received`,
        content: `New lead from ${source}: ${name}${email ? ` (${email})` : ""}${phone ? ` — ${phone}` : ""}${message ? `\n\n"${message}"` : ""}`,
        dealId: deal.id,
        contactId: contact.id,
      },
    });

    const triage = await triageIncomingLead(workspaceId, {
      title,
      description: message || undefined,
      address: address || undefined,
    }).catch(() => null);
    const heldForReview = triage?.recommendation === "HOLD_REVIEW";

    if (triage) {
      await saveTriageRecommendation(deal.id, triage).catch(() => {});
    }

    // Decide whether to dispatch an auto-callback via the voice agent.
    // Workspace-level policy comes from canAutoCallLead; per-lead reasons
    // (no phone on this lead, after-hours, triage held) are checked here.
    const eligibility = canAutoCallLead(workspace);
    const withinCallWindow = isWithinAllowedCallWindow(workspace.settings);
    const hasPhone = phone.length > 0;
    let autoCallTriggered = false;
    let autoCallBlockReason: AutoCallBlockReason | "no_lead_phone" | "triage_review" | "after_hours" | null = null;

    if (!eligibility.allowed) {
      autoCallBlockReason = eligibility.reason;
    } else if (!hasPhone) {
      autoCallBlockReason = "no_lead_phone";
    } else if (heldForReview) {
      autoCallBlockReason = "triage_review";
    } else if (!withinCallWindow) {
      autoCallBlockReason = "after_hours";
    } else {
      autoCallTriggered = true;
      scheduleLeadCallback({
        workspaceId,
        contactPhone: phone,
        contactName: name,
        dealId: deal.id,
        reason: `webform_lead:${source}`,
        delaySec: workspace.autoCallDelaySec ?? 60,
      }).catch((err) => {
        console.error("[Webform webhook] scheduleLeadCallback failed:", err);
      });
    }

    if (autoCallBlockReason) {
      console.info(
        `[Webform webhook] auto-call blocked for deal ${deal.id} (workspace ${workspaceId}): ${autoCallBlockReason}`,
      );
    }

    // Customer-facing new-lead automations must not fire for held leads.
    if (!heldForReview) {
      evaluateAutomations(workspaceId, {
        type: "new_lead",
        contactId: contact.id,
        dealId: deal.id,
      }).catch(() => {});
    }

    // Optionally notify workspace owner
    try {
      const owner = await db.user.findFirst({ where: { workspaceId, role: "OWNER" }, select: { id: true } });
      if (owner) {
        const notificationTitle = heldForReview
          ? `Review ${source} enquiry - ${name}`
          : `New ${source} enquiry - ${name}`;
        const notificationMessage = heldForReview
          ? `Tracey held this lead for review: ${(triage?.flags ?? ["Needs review"]).join("; ")}`
          : message ? `"${message.substring(0, 100)}${message.length > 100 ? "..." : ""}"` : `${name} submitted an enquiry via your ${source}.`;
        await db.notification.create({
          data: {
            userId: owner.id,
            title: notificationTitle,
            message: notificationMessage,
            type: heldForReview ? "WARNING" : "INFO",
            link: `/crm/deals/${deal.id}`,
            actionType: "CONFIRM_JOB",
            actionPayload: { dealId: deal.id },
          } as any,
        });
      }
    } catch {
      // Notification failure is non-blocking
    }

    // If redirect_url provided, redirect (for traditional HTML form POST).
    // Resolve against the request URL so relative paths like
    // "/quote/xxx/thanks" work, and refuse cross-origin redirects to
    // prevent open-redirect abuse.
    if (redirectUrl) {
      try {
        const resolved = new URL(redirectUrl, req.url);
        const reqOrigin = new URL(req.url).origin;
        if (resolved.origin !== reqOrigin) {
          console.warn(`[Webform webhook] refusing cross-origin redirect to ${resolved.origin}`);
        } else {
          return NextResponse.redirect(resolved.toString(), { status: 303, headers: corsHeaders() });
        }
      } catch {
        console.warn(`[Webform webhook] ignoring malformed redirect_url: ${redirectUrl}`);
      }
    }

    return NextResponse.json({
      success: true,
      dealId: deal.id,
      contactId: contact.id,
      heldForReview,
      triageRecommendation: triage?.recommendation ?? null,
      triageFlags: triage?.flags ?? [],
      autoCallTriggered,
      autoCallBlockReason,
    }, { headers: corsHeaders() });
  } catch (error) {
    console.error("[Webform webhook] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders() });
  }
}

/** Simple GET handler so the endpoint can be tested via browser */
export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/webhooks/webform",
    description: "Accepts website contact form submissions and creates CRM leads",
    fields: ["workspace_id (required)", "name", "email", "phone", "message", "job_type", "address", "source", "secret", "redirect_url"],
  }, { headers: corsHeaders() });
}
