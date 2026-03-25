import { NextResponse } from "next/server";
import { removePushSubscriptionByEndpoint } from "@/lib/push-notifications";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null) as { endpoint?: string } | null;
  if (!body?.endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }
  await removePushSubscriptionByEndpoint(body.endpoint);
  return NextResponse.json({ success: true });
}
