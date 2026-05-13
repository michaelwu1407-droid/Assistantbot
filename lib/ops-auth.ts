function getBearerToken(req: Request) {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function normalizeSecret(value: string | undefined | null) {
  return value?.trim() || "";
}

export function isOpsAuthorized(req: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;

  const provided = [
    getBearerToken(req),
    normalizeSecret(req.headers.get("x-telemetry-key")),
    normalizeSecret(req.headers.get("x-ops-key")),
  ].filter(Boolean);

  const expected = [
    normalizeSecret(process.env.CRON_SECRET),
    normalizeSecret(process.env.TELEMETRY_ADMIN_KEY),
  ].filter(Boolean);

  return expected.length > 0 && provided.some((value) => expected.includes(value));
}

export function getUnauthorizedJsonResponse() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
