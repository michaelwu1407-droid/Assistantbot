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
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

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
      return NextResponse.json({ error: "workspace_id is required" }, { status: 400 });
    }

    // Optional shared-secret verification
    const webhookSecret = process.env.WEBFORM_WEBHOOK_SECRET;
    if (webhookSecret && body.secret !== webhookSecret) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    // Validate workspace exists
    const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, name: true } });
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const name = (body.name || body.full_name || body.customer_name || "Website Enquiry").trim();
    const email = (body.email || body.customer_email || "").toLowerCase().trim();
    const phone = (body.phone || body.mobile || body.customer_phone || "").trim();
    const message = (body.message || body.enquiry || body.description || "").trim();
    const jobType = (body.job_type || body.service_type || body.work_type || "").trim();
    const address = (body.address || body.location || body.site_address || "").trim();
    const source = (body.source || "website").trim();

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

    // Optionally notify workspace owner
    try {
      const owner = await db.user.findFirst({ where: { workspaceId, role: "OWNER" }, select: { id: true } });
      if (owner) {
        await db.notification.create({
          data: {
            userId: owner.id,
            title: `New ${source} enquiry — ${name}`,
            message: message ? `"${message.substring(0, 100)}${message.length > 100 ? "…" : ""}"` : `${name} submitted an enquiry via your ${source}.`,
            type: "INFO",
            link: `/dashboard/pipeline`,
            actionType: "CONFIRM_JOB",
            actionPayload: { dealId: deal.id },
          } as any,
        });
      }
    } catch {
      // Notification failure is non-blocking
    }

    return NextResponse.json({ success: true, dealId: deal.id, contactId: contact.id });
  } catch (error) {
    console.error("[Webform webhook] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Simple GET handler so the endpoint can be tested via browser */
export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/webhooks/webform",
    description: "Accepts website contact form submissions and creates CRM leads",
    fields: ["workspace_id (required)", "name", "email", "phone", "message", "job_type", "address", "source", "secret"],
  });
}
