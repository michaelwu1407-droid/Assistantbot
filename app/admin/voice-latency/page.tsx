import { requireInternalAdminAccess } from "@/lib/internal-admin";
import { VOICE_METRIC_KEYS, getLatencySnapshot } from "@/lib/telemetry/latency";

export const dynamic = "force-dynamic";

type Summary = { count: number; avgMs: number; minMs: number; maxMs: number; p50Ms: number; p95Ms: number };

const EMPTY: Summary = { count: 0, avgMs: 0, minMs: 0, maxMs: 0, p50Ms: 0, p95Ms: 0 };

const PROVIDERS = [
  { key: "groq", label: "Groq" },
  { key: "deepinfra", label: "DeepInfra" },
] as const;

function fmt(ms: number): string {
  return ms > 0 ? `${Math.round(ms)} ms` : "—";
}

function ProviderCard({
  label,
  llm,
  ttft,
}: {
  label: string;
  llm: Summary;
  ttft: Summary;
}) {
  const hasData = llm.count > 0;
  return (
    <div className="rounded-md border bg-card p-4 shadow-sm" style={{ borderColor: "#E6E2D7" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="app-panel-title">{label}</span>
        <span className="app-field-label">{hasData ? `${llm.count} turns` : "no data yet"}</span>
      </div>
      {hasData ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          <Stat term="LLM avg" value={fmt(llm.avgMs)} />
          <Stat term="LLM p95" value={fmt(llm.p95Ms)} />
          <Stat term="TTFT avg" value={fmt(ttft.avgMs)} />
          <Stat term="TTFT p95" value={fmt(ttft.p95Ms)} />
          <Stat term="LLM p50" value={fmt(llm.p50Ms)} />
          <Stat term="LLM max" value={fmt(llm.maxMs)} />
        </dl>
      ) : (
        <p className="app-body-secondary text-xs">
          No completed calls have routed through {label} since the last telemetry reset.
        </p>
      )}
    </div>
  );
}

function Stat({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 min-w-0">
      <dt className="app-field-label truncate">{term}</dt>
      <dd className="app-body-primary tabular-nums shrink-0">{value}</dd>
    </div>
  );
}

function StageRow({ label, primary, secondary }: { label: string; primary: Summary; secondary: Summary }) {
  return (
    <div
      className="flex items-center justify-between gap-3 rounded-md border bg-card px-4 py-3 shadow-sm"
      style={{ borderColor: "#E6E2D7" }}
    >
      <span className="app-panel-title">{label}</span>
      <div className="flex items-center gap-6">
        <Stat term="avg" value={fmt(primary.avgMs)} />
        <Stat term="p95" value={fmt(primary.p95Ms)} />
        {secondary.count > 0 && <Stat term="ttfb avg" value={fmt(secondary.avgMs)} />}
        <span className="app-field-label">{primary.count} samples</span>
      </div>
    </div>
  );
}

export default async function VoiceLatencyPage() {
  await requireInternalAdminAccess();

  const snapshot = await getLatencySnapshot();
  const m = (key: string): Summary => (snapshot.metrics[key] as Summary) ?? EMPTY;

  const groqLlm = m(VOICE_METRIC_KEYS.llmGroq);
  const deepinfraLlm = m(VOICE_METRIC_KEYS.llmDeepinfra);
  const hasAny = groqLlm.count > 0 || deepinfraLlm.count > 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6">
      <div>
        <h1 className="app-page-title">Voice latency by provider</h1>
        <p className="app-body-secondary mt-1">
          Per-call averages recorded after each Tracey call, split by the LLM provider that
          actually served the turn. Use this to tune the Groq vs DeepInfra routing. Values are
          aggregated across recent calls (rolling window).
        </p>
      </div>

      {!hasAny && (
        <div
          className="rounded-md border bg-muted/30 px-4 py-6 text-center"
          style={{ borderColor: "#E6E2D7" }}
        >
          <p className="app-body-secondary">
            No voice latency samples yet. Complete a Tracey call, then refresh — provider stats
            populate from the post-call telemetry write.
          </p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <ProviderCard label="Groq" llm={groqLlm} ttft={m(VOICE_METRIC_KEYS.llmGroqTtft)} />
        <ProviderCard label="DeepInfra" llm={deepinfraLlm} ttft={m(VOICE_METRIC_KEYS.llmDeepinfraTtft)} />
      </div>

      <div>
        <h2 className="app-section-title mb-2">Speech pipeline</h2>
        <div className="space-y-2">
          <StageRow label="STT (Deepgram)" primary={m(VOICE_METRIC_KEYS.stt)} secondary={EMPTY} />
          <StageRow label="TTS (Cartesia)" primary={m(VOICE_METRIC_KEYS.tts)} secondary={m(VOICE_METRIC_KEYS.ttsTtfb)} />
        </div>
      </div>

      <p className="app-body-secondary text-xs">
        Snapshot generated {new Date(snapshot.generatedAt).toLocaleString("en-AU")} · window{" "}
        {snapshot.windowSize}.
      </p>
    </div>
  );
}
