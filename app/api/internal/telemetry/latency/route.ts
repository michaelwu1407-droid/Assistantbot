import { getLatencySnapshot, resetLatencyTelemetry } from "@/lib/telemetry/latency";

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
  return new Response(JSON.stringify(getLatencySnapshot()), {
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
  resetLatencyTelemetry();
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
