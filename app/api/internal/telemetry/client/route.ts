import { NextRequest, NextResponse } from "next/server";
import { recordLatencyMetric } from "@/lib/telemetry/latency";

export const dynamic = "force-dynamic";

const ALLOWED_METRIC_PREFIX = "chat.client.";
const MAX_DURATION_MS = 60_000;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { metric, duration } = body;

        if (
            typeof metric !== "string" ||
            !metric.startsWith(ALLOWED_METRIC_PREFIX) ||
            typeof duration !== "number" ||
            !Number.isFinite(duration) ||
            duration < 0 ||
            duration > MAX_DURATION_MS
        ) {
            return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
        }

        recordLatencyMetric(metric, Math.round(duration));
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
}
