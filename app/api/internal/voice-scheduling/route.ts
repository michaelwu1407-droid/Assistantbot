import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isVoiceAgentSecretAuthorized } from "@/lib/voice-agent-auth";
import { runCreateJobNatural } from "@/actions/chat-actions";

export const dynamic = "force-dynamic";

// ── Inline geocode (Nominatim) so the agent doesn't need a separate endpoint ──
async function geocodeAddress(address: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { "User-Agent": "Earlymark/1.0" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.length) return null;
    return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const payloadSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("check_availability"),
    workspaceId: z.string(),
    date: z.string().optional(),
  }),
  z.object({
    action: z.literal("find_nearby"),
    workspaceId: z.string(),
    address: z.string(),
    date: z.string(),
  }),
  z.object({
    action: z.literal("create_job"),
    workspaceId: z.string(),
    clientName: z.string(),
    address: z.string(),
    workDescription: z.string(),
    schedule: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    price: z.number().optional(),
  }),
]);

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleCheckAvailability(workspaceId: string, dateHint?: string) {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { workingHoursStart: true, workingHoursEnd: true },
  });

  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 7);

  const booked = await db.deal.findMany({
    where: {
      workspaceId,
      scheduledAt: { gte: from, lte: to },
      stage: { in: ["SCHEDULED", "NEGOTIATION", "CONTACTED"] },
      jobStatus: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    select: { scheduledAt: true, title: true },
    orderBy: { scheduledAt: "asc" },
  });

  const workStart = workspace?.workingHoursStart ?? "08:00";
  const workEnd = workspace?.workingHoursEnd ?? "17:00";

  if (booked.length === 0) {
    return {
      summary: `No jobs are currently booked in the next 7 days. Working hours are ${workStart}–${workEnd}. The team is available to book a job any time this week.`,
    };
  }

  const bookedSlots = booked
    .map((d) => {
      if (!d.scheduledAt) return null;
      const dt = new Date(d.scheduledAt);
      return dt.toLocaleString("en-AU", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    })
    .filter(Boolean);

  return {
    summary: `Working hours are ${workStart}–${workEnd}. Booked slots in the next 7 days: ${bookedSlots.join(", ")}. Use this to suggest open times around these bookings.`,
    bookedSlots,
    dateHint,
  };
}

async function handleFindNearby(workspaceId: string, address: string, date: string) {
  const coords = await geocodeAddress(address);
  if (!coords) {
    return { summary: "Could not geocode the job address — no nearby-job check available." };
  }

  let targetDate: Date;
  try {
    targetDate = new Date(date);
    if (isNaN(targetDate.getTime())) targetDate = new Date();
  } catch {
    targetDate = new Date();
  }

  const startDate = new Date(targetDate);
  startDate.setDate(startDate.getDate() - 1);
  const endDate = new Date(targetDate);
  endDate.setDate(endDate.getDate() + 1);

  const candidates = await db.deal.findMany({
    where: {
      workspaceId,
      scheduledAt: { gte: startDate, lte: endDate },
      latitude: { not: null },
      longitude: { not: null },
      stage: { in: ["SCHEDULED", "NEGOTIATION", "CONTACTED", "WON", "INVOICED"] },
      jobStatus: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    select: { title: true, latitude: true, longitude: true, scheduledAt: true },
  });

  let closest: { title: string; distance: number; scheduledAt: Date | null } | null = null;
  let minDist = 10.0;

  for (const deal of candidates) {
    if (deal.latitude === null || deal.longitude === null) continue;
    const dist = calculateDistance(coords.latitude, coords.longitude, deal.latitude, deal.longitude);
    if (dist < minDist) {
      minDist = dist;
      closest = { title: deal.title, distance: dist, scheduledAt: deal.scheduledAt };
    }
  }

  if (!closest) {
    return { summary: "No other jobs are currently booked nearby on that day." };
  }

  const when = closest.scheduledAt
    ? new Date(closest.scheduledAt).toLocaleString("en-AU", { weekday: "short", hour: "2-digit", minute: "2-digit" })
    : "that day";
  return {
    summary: `There is already a job "${closest.title}" booked ${closest.distance.toFixed(1)}km away on ${when}. Mention to the caller that this area works well and you can cluster jobs efficiently.`,
    nearbyJob: closest,
  };
}

async function handleCreateJob(
  workspaceId: string,
  params: {
    clientName: string;
    address: string;
    workDescription: string;
    schedule?: string;
    phone?: string;
    email?: string;
    price?: number;
  }
) {
  const result = await runCreateJobNatural(workspaceId, {
    clientName: params.clientName,
    address: params.address,
    workDescription: params.workDescription,
    schedule: params.schedule,
    phone: params.phone,
    email: params.email,
    price: params.price ?? 0,
  });

  return result;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const providedSecret = req.headers.get("x-voice-agent-secret") || "";
    if (!isVoiceAgentSecretAuthorized(providedSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = payloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const data = parsed.data;

    if (data.action === "check_availability") {
      const result = await handleCheckAvailability(data.workspaceId, data.date);
      return NextResponse.json({ success: true, ...result });
    }

    if (data.action === "find_nearby") {
      const result = await handleFindNearby(data.workspaceId, data.address, data.date);
      return NextResponse.json({ success: true, ...result });
    }

    if (data.action === "create_job") {
      const result = await handleCreateJob(data.workspaceId, {
        clientName: data.clientName,
        address: data.address,
        workDescription: data.workDescription,
        schedule: data.schedule,
        phone: data.phone,
        email: data.email,
        price: data.price,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[voice-scheduling] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
