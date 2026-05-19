import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { logger } from "@/lib/logging";

const MAX_MESSAGE_LENGTH = 2_000;
const MAX_STACK_LENGTH = 10_000;

function clampString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = (body && typeof body === "object") ? body as Record<string, unknown> : {};
  const message = clampString(payload.message, MAX_MESSAGE_LENGTH) ?? "(no message)";
  const stack = clampString(payload.stack, MAX_STACK_LENGTH);

  logger.error("Client-side crash reported", {
    component: "client-error-boundary",
    userId: user.id,
    stack,
  }, new Error(message));

  return NextResponse.json({ ok: true });
}
