function getBearerToken(req: Request) {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

export function isOpsAuthorized(req: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;

  const provided = [
    getBearerToken(req),
    req.headers.get("x-telemetry-key") || "",
    req.headers.get("x-ops-key") || "",
  ].filter(Boolean);

  const expected = [
    process.env.CRON_SECRET,
    process.env.TELEMETRY_ADMIN_KEY,
  ].filter(Boolean) as string[];

  return expected.length > 0 && provided.some((value) => expected.includes(value));
}

export function getUnauthorizedJsonResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
