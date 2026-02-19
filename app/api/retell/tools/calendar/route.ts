import Retell from "retell-sdk";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// This route is a READ-ONLY tool endpoint used live during calls.
// It must NOT perform any writes or long-lived connections.

export async function POST(req: Request) {
  // 1. Read raw body FIRST for HMAC verification.
  const rawBody = await req.text();

  const signature = req.headers.get("x-retell-signature") ?? "";
  const apiKey = process.env.RETELL_API_KEY;

  if (!apiKey || !signature || !rawBody) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 2. Verify the webhook signature using raw body.
  const valid = Retell.verify(rawBody, apiKey, signature);
  if (!valid) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 3. Safely parse JSON AFTER verification.
  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const { date, workspace_id } = body ?? {};
  if (!date || !workspace_id) {
    return NextResponse.json(
      { error: "Missing required fields: date, workspace_id" },
      { status: 400 },
    );
  }

  // Interpret `date` as a day (YYYY-MM-DD or ISO string) and return
  // existing bookings / jobs for that day so the agent can reason
  // about availability.
  const dayStart = new Date(date);
  if (Number.isNaN(dayStart.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  // READ-ONLY Prisma query: find all deals/jobs scheduled on that day.
  const scheduledJobs = await db.deal.findMany({
    where: {
      workspaceId: workspace_id,
      scheduledAt: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
    select: {
      id: true,
      title: true,
      scheduledAt: true,
      stage: true,
      contact: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  // Map to a strict JSON shape that the voice agent can consume.
  return NextResponse.json({
    date,
    workspace_id,
    scheduled_jobs: scheduledJobs.map((job) => ({
      id: job.id,
      title: job.title,
      stage: job.stage,
      scheduled_at: job.scheduledAt,
      contact: job.contact
        ? {
            id: job.contact.id,
            name: job.contact.name,
          }
        : null,
    })),
  });
}

