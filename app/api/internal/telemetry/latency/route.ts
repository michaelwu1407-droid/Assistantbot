import { getLatencySnapshot, getLatencyWaterfall, resetLatencyTelemetry } from "@/lib/telemetry/latency";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const expected = process.env.TELEMETRY_ADMIN_KEY;
  if (!expected) return false;
  const provided = req.headers.get("x-telemetry-key");
  return provided === expected;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  const url = new URL(req.url);
  const view = url.searchParams.get("view");
  if (view === "waterfall") {
    const topTools = parseInt(url.searchParams.get("top_tools") ?? "10", 10);
    return new Response(JSON.stringify(await getLatencyWaterfall(topTools)), {
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify(await getLatencySnapshot()), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE(req: Request) {
  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  await resetLatencyTelemetry();
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
