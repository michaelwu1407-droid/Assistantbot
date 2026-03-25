import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { savePushSubscription } from "@/lib/push-notifications";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (!auth?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await db.user.findFirst({
    where: { email: auth.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null) as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  } | null;
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription payload" }, { status: 400 });
  }

  await savePushSubscription(
    user.id,
    {
      endpoint: body.endpoint,
      keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
    },
    req.headers.get("user-agent") ?? undefined,
  );
  return NextResponse.json({ success: true });
}
