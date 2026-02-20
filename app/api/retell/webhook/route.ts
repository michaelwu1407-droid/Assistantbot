import Retell from "retell-sdk";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateDealStage } from "@/actions/deal-actions";

// Secure post-call webhook for WRITE operations.
// Retell will call this AFTER the call has been analyzed.

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

  if (body?.event !== "call_analyzed") {
    // We only care about post-call analysis events.
    return new NextResponse(null, { status: 204 });
  }

  // Depending on Retell configuration, analysis payload might live under
  // `body.data`, `body.analysis`, or directly on the root.
  const analysis = body.data ?? body.analysis ?? body;
  const kanbanAction: string | undefined = analysis?.kanban_action;
  const contactName: string | undefined = analysis?.contact_name;

  // Retell includes the call details in the webhook. Find the number the user dialed.
  const callContext = body.call ?? {};
  const systemNumber = callContext.to_number || callContext.from_number;

  if (!kanbanAction || !contactName) {
    // Nothing to do if we don't know what to update.
    return new NextResponse(null, { status: 204 });
  }

  if (!systemNumber) {
    console.warn("[Retell webhook] No system number found in payload to route workspace.");
    return new NextResponse("Bad Request: Missing routing number", { status: 400 });
  }

  try {
    // 1. Strictly resolve the Workspace by matching the Retell dialed number
    const workspace = await db.workspace.findFirst({
      where: { twilioPhoneNumber: systemNumber }
    });

    if (!workspace) {
      console.warn(`[Retell webhook] No workspace matched with number: ${systemNumber}`);
      return new NextResponse("Workspace Not Found", { status: 404 });
    }

    // 2. Find the contact by name, strictly within this workspace.
    const contact = await db.contact.findFirst({
      where: {
        name: contactName,
        workspaceId: workspace.id
      },
      select: {
        id: true,
      },
    });

    if (!contact) {
      console.warn(`[Retell webhook] Contact '${contactName}' not found in workspace ${workspace.id}`);
      return new NextResponse(null, { status: 204 });
    }

    // 3. Find the most recent active deal/job for this contact.
    const deal = await db.deal.findFirst({
      where: {
        contactId: contact.id,
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
      },
    });

    if (!deal) {
      console.warn("[Retell webhook] No deal found for contact:", contactName);
      return new NextResponse(null, { status: 204 });
    }

    // 3. Map the analysis `kanban_action` to our front-end stage id.
    //    For example, Retell might return:
    //      - \"move_to_scheduled\"  -> \"scheduled\"
    //      - \"move_to_deleted\"    -> \"deleted\"
    //      - \"move_to_completed\"  -> \"completed\"
    //
    //    Adjust this mapping as you refine your analysis schema.
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

    // 4. Use the existing server action to persist the Kanban move.
    //    This will:
    //      - Update the Prisma Deal stage
    //      - Log an Activity
    //      - Trigger Automations
    await updateDealStage(deal.id, targetStage);

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[Retell webhook] Failed to process call_analyzed event:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

