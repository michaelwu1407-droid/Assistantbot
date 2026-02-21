import Retell from "retell-sdk";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateDealStage } from "@/actions/deal-actions";

// Unified Retell webhook: handles both call_ended (activity logging) and
// call_analyzed (kanban stage updates). Replaces the Vapi webhook entirely.

export async function POST(req: Request) {
  const rawBody = await req.text();

  const signature = req.headers.get("x-retell-signature") ?? "";
  const apiKey = process.env.RETELL_API_KEY;

  if (!apiKey || !signature || !rawBody) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const valid = Retell.verify(rawBody, apiKey, signature);
  if (!valid) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const event = body?.event;

  // ────────────────────────────────────────────────────────────────────
  // call_ended: Log the call as an activity (inbound + outbound)
  // ────────────────────────────────────────────────────────────────────
  if (event === "call_ended") {
    return handleCallEnded(body);
  }

  // ────────────────────────────────────────────────────────────────────
  // call_analyzed: Update deal stage based on post-call AI analysis
  // ────────────────────────────────────────────────────────────────────
  if (event === "call_analyzed") {
    return handleCallAnalyzed(body);
  }

  // Ignore any other event types
  return new NextResponse(null, { status: 204 });
}

// ── call_ended handler ──────────────────────────────────────────────
async function handleCallEnded(body: any) {
  try {
    const call = body.call ?? body.data ?? {};

    // Determine direction and numbers
    const direction: "inbound" | "outbound" = call.direction ?? "inbound";
    const customerNumber = direction === "inbound" ? call.from_number : call.to_number;
    const systemNumber = direction === "inbound" ? call.to_number : call.from_number;

    if (!customerNumber || !systemNumber) {
      console.warn("[Retell webhook] call_ended missing phone numbers");
      return new NextResponse(null, { status: 204 });
    }

    // 1. Route to workspace via system phone number
    const workspace = await db.workspace.findFirst({
      where: { twilioPhoneNumber: systemNumber },
    });
    if (!workspace) {
      console.warn(`[Retell webhook] No workspace for number: ${systemNumber}`);
      return new NextResponse("Workspace Not Found", { status: 404 });
    }

    // 2. Find or create contact by phone number
    let contact = await db.contact.findFirst({
      where: { phone: customerNumber, workspaceId: workspace.id },
    });
    if (!contact) {
      // Outbound calls should already have a contact; for inbound, create one
      contact = await db.contact.create({
        data: {
          name: call.metadata?.contact_name ?? "Unknown Caller",
          phone: customerNumber,
          workspaceId: workspace.id,
        },
      });
    }

    // 3. Build activity content
    const durationSec = call.duration_ms ? Math.round(call.duration_ms / 1000) : call.duration ?? 0;
    const transcript = call.transcript ?? "";
    const recordingUrl = call.recording_url ?? null;
    const summary = call.call_analysis?.call_summary ?? "";

    const contentParts = [
      `Duration: ${durationSec}s`,
      summary || (transcript ? `Transcript: ${transcript.slice(0, 500)}${transcript.length > 500 ? "…" : ""}` : "No summary available"),
    ];
    if (recordingUrl) {
      contentParts.push(`\nRecording: ${recordingUrl}`);
    }
    if (call.metadata?.purpose) {
      contentParts.push(`\nPurpose: ${call.metadata.purpose}`);
    }

    // 4. Log as CALL activity
    await db.activity.create({
      data: {
        type: "CALL",
        title: `${direction === "inbound" ? "Inbound" : "Outbound"} call ${direction === "inbound" ? "from" : "to"} ${contact.name}`,
        description: call.call_status ?? call.status ?? "completed",
        content: contentParts.join("\n\n"),
        contactId: contact.id,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[Retell webhook] call_ended error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// ── call_analyzed handler ───────────────────────────────────────────
async function handleCallAnalyzed(body: any) {
  const analysis = body.data ?? body.analysis ?? body;
  const kanbanAction: string | undefined = analysis?.kanban_action;
  const contactName: string | undefined = analysis?.contact_name;

  const callContext = body.call ?? {};
  const systemNumber = callContext.to_number || callContext.from_number;

  if (!kanbanAction || !contactName) {
    return new NextResponse(null, { status: 204 });
  }
  if (!systemNumber) {
    console.warn("[Retell webhook] No system number found in call_analyzed payload.");
    return new NextResponse("Bad Request: Missing routing number", { status: 400 });
  }

  try {
    const workspace = await db.workspace.findFirst({
      where: { twilioPhoneNumber: systemNumber },
    });
    if (!workspace) {
      console.warn(`[Retell webhook] No workspace matched number: ${systemNumber}`);
      return new NextResponse("Workspace Not Found", { status: 404 });
    }

    const contact = await db.contact.findFirst({
      where: { name: contactName, workspaceId: workspace.id },
      select: { id: true },
    });
    if (!contact) {
      console.warn(`[Retell webhook] Contact '${contactName}' not found in workspace ${workspace.id}`);
      return new NextResponse(null, { status: 204 });
    }

    const deal = await db.deal.findFirst({
      where: { contactId: contact.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });
    if (!deal) {
      console.warn("[Retell webhook] No deal found for contact:", contactName);
      return new NextResponse(null, { status: 204 });
    }

    const actionToStage: Record<string, string> = {
      move_to_new: "new_request",
      move_to_quote_sent: "quote_sent",
      move_to_scheduled: "scheduled",
      move_to_pipeline: "pipeline",
      move_to_ready_to_invoice: "ready_to_invoice",
      move_to_completed: "completed",
      move_to_lost: "lost",
      move_to_deleted: "deleted",
    };

    const targetStage = actionToStage[kanbanAction] ?? kanbanAction;
    await updateDealStage(deal.id, targetStage);

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[Retell webhook] call_analyzed error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
