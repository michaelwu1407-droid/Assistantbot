import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getWorkspaceVoiceGrounding } from "@/lib/ai/context";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  calledPhone: z.string().optional(),
  workspaceId: z.string().optional(),
});

function getExpectedSecret() {
  return process.env.VOICE_AGENT_WEBHOOK_SECRET || process.env.LIVEKIT_API_SECRET || "";
}

function normalisePhone(phone?: string | null) {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return `+61${cleaned.slice(1)}`;
  if (cleaned.startsWith("61")) return `+${cleaned}`;
  return cleaned;
}

function phoneVariants(phone?: string | null) {
  const normalized = normalisePhone(phone);
  if (!normalized) return [];
  const digits = normalized.replace(/[^\d]/g, "");
  const variants = new Set<string>([
    normalized,
    digits,
    digits.startsWith("61") ? `0${digits.slice(2)}` : digits,
    digits.startsWith("61") ? digits.slice(2) : digits,
  ]);
  return Array.from(variants).filter(Boolean);
}

async function findWorkspaceIdByCalledNumber(calledPhone?: string) {
  const variants = phoneVariants(calledPhone);
  if (!variants.length) return null;

  const workspaces = await db.workspace.findMany({
    where: { twilioPhoneNumber: { not: null } },
    select: { id: true, twilioPhoneNumber: true },
  });

  for (const workspace of workspaces) {
    const workspaceVariants = phoneVariants(workspace.twilioPhoneNumber);
    if (workspaceVariants.some((value) => variants.includes(value))) {
      return workspace.id;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = getExpectedSecret();
    const providedSecret = req.headers.get("x-voice-agent-secret") || "";

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = payloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const workspaceId = parsed.data.workspaceId || await findWorkspaceIdByCalledNumber(parsed.data.calledPhone);
    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const grounding = await getWorkspaceVoiceGrounding(workspaceId);
    if (!grounding) {
      return NextResponse.json({ error: "Voice grounding not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, grounding });
  } catch (error) {
    console.error("[voice-context-webhook] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
