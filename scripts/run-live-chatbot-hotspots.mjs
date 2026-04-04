import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const DEFAULT_DEBUG_URL = process.env.CHROME_DEBUG_URL || "http://127.0.0.1:9222";
const DEFAULT_BASE_URL = process.env.LIVE_CHATBOT_BASE_URL || "https://www.earlymark.ai";
const DEFAULT_COUNT = Number(process.env.LIVE_CHATBOT_HOTSPOT_COUNT || 20);
const DEFAULT_DELAY_MS = Number(process.env.LIVE_CHATBOT_DELAY_MS || 2100);
const DEFAULT_SOURCE_RESULTS = process.env.LIVE_CHATBOT_SOURCE_RESULTS
  || path.join(process.cwd(), "test-results", "live-chatbot-regression", "latest.json");

function formatRunId() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `hotspots_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function parseArgs(argv) {
  const options = {
    debugUrl: DEFAULT_DEBUG_URL,
    baseUrl: DEFAULT_BASE_URL,
    count: DEFAULT_COUNT,
    ids: [],
    delayMs: DEFAULT_DELAY_MS,
    sourceResults: DEFAULT_SOURCE_RESULTS,
    runId: formatRunId(),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--debug-url" && next) {
      options.debugUrl = next;
      i += 1;
    } else if (arg === "--base-url" && next) {
      options.baseUrl = next.replace(/\/$/, "");
      i += 1;
    } else if (arg === "--count" && next) {
      options.count = Number(next);
      i += 1;
    } else if (arg === "--ids" && next) {
      options.ids = next.split(",").map((value) => value.trim()).filter(Boolean);
      i += 1;
    } else if (arg === "--source-results" && next) {
      options.sourceResults = next;
      i += 1;
    } else if (arg === "--run-id" && next) {
      options.runId = next;
      i += 1;
    } else if (arg === "--delay-ms" && next) {
      options.delayMs = Number(next);
      i += 1;
    }
  }

  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index];
}

function parseServerTiming(value) {
  if (!value) return {};
  return Object.fromEntries(
    value
      .split(",")
      .map((entry) => entry.trim())
      .map((entry) => {
        const [name, ...parts] = entry.split(";");
        const durPart = parts.find((part) => part.trim().startsWith("dur="));
        return [name.trim(), durPart ? Number(durPart.split("=")[1]) : null];
      }),
  );
}

function looksLikeRefusal(text) {
  return /\b(i can't|i cannot|unable to|couldn't|cannot do that|not able to|failed to)\b/i.test(text);
}

function looksLikeDraftLoop(text) {
  return /here(?:'|’|â€™)s what i got|edit anything before confirming/i.test(text);
}

function looksLikeGuardrail(text) {
  return /\b(did not send|didn't send|draft instead|disabled in this mode|qa rule|did not call|did not text|did not email)\b/i.test(text);
}

function parseSseEvents(raw) {
  const events = [];
  const blocks = raw.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    const lines = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data: "))
      .map((line) => line.slice(6));
    if (!lines.length) continue;
    const payload = lines.join("\n");
    try {
      events.push(JSON.parse(payload));
    } catch {
      // Ignore malformed chunks.
    }
  }
  return events;
}

async function discoverWorkspaceSession({ debugUrl, baseUrl }) {
  const browser = await chromium.connectOverCDP(debugUrl);
  const context = browser.contexts()[0];
  if (!context) {
    throw new Error("No Chrome context available. Make sure the signed-in visible Chrome session is running with remote debugging.");
  }

  const page = await context.newPage();
  await page.goto(`${baseUrl}/crm/dashboard#live-chatbot-hotspots`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const html = await page.content();
  const match = html.match(/workspaceId(?:\"|\\\")?\s*[:=]\s*(?:\"|\\\")([a-zA-Z0-9_-]{8,})/);
  if (!match) {
    throw new Error("Could not discover workspaceId from the live CRM page.");
  }

  const workspaceId = match[1];
  const cookies = await context.cookies(baseUrl);
  const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  await page.close();
  await browser.close();
  return { workspaceId, cookieHeader };
}

async function sendChatRequest({ baseUrl, workspaceId, cookieHeader, prompt }) {
  const start = Date.now();
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
      cookie: cookieHeader,
    },
    body: JSON.stringify({
      workspaceId,
      messages: [{ role: "user", parts: [{ type: "text", text: prompt }] }],
    }),
  });

  const serverTiming = response.headers.get("server-timing");
  const retryAfterHeader = response.headers.get("retry-after");
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Chat response body was not readable.");
  }

  let raw = "";
  let firstChunkMs = null;
  let firstTextDeltaMs = null;
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (firstChunkMs == null) firstChunkMs = Date.now() - start;
    raw += decoder.decode(value, { stream: true });
    if (firstTextDeltaMs == null && /"type":"text-delta"/.test(raw)) {
      firstTextDeltaMs = Date.now() - start;
    }
  }
  raw += decoder.decode();

  const totalMs = Date.now() - start;
  const events = parseSseEvents(raw);
  let assistantText = "";
  const toolOutputs = [];

  for (const event of events) {
    if (event?.type === "text-delta" && typeof event.delta === "string") {
      assistantText += event.delta;
    }
    if (event?.type === "tool-output-available" && typeof event.output !== "undefined") {
      toolOutputs.push(event.output);
    }
  }

  return {
    status: response.status,
    retryAfterMs: retryAfterHeader ? Number(retryAfterHeader) * 1000 : null,
    serverTiming,
    serverTimingParsed: parseServerTiming(serverTiming),
    totalMs,
    firstChunkMs,
    firstTextDeltaMs,
    raw,
    assistantText: assistantText.trim(),
    toolOutputs,
    refusal: looksLikeRefusal(assistantText),
    draftLoop: looksLikeDraftLoop(assistantText),
    guardrailRespected: looksLikeGuardrail(assistantText),
  };
}

function buildSummary(results) {
  const firstChunkValues = results.map((result) => result.metrics.firstChunkMs).filter(Number.isFinite);
  const firstTextValues = results.map((result) => result.metrics.firstTextDeltaMs).filter(Number.isFinite);
  const totalValues = results.map((result) => result.metrics.totalMs).filter(Number.isFinite);

  return {
    totalCases: results.length,
    httpErrorCount: results.filter((result) => result.httpStatus >= 400).length,
    refusalCount: results.filter((result) => result.flags.refusal).length,
    draftLoopCount: results.filter((result) => result.flags.draftLoop).length,
    guardrailCount: results.filter((result) => result.flags.guardrailRespected).length,
    firstChunkP50Ms: percentile(firstChunkValues, 50),
    firstChunkP95Ms: percentile(firstChunkValues, 95),
    firstTextP50Ms: percentile(firstTextValues, 50),
    firstTextP95Ms: percentile(firstTextValues, 95),
    totalP50Ms: percentile(totalValues, 50),
    totalP95Ms: percentile(totalValues, 95),
  };
}

function buildMarkdownSummary({ runId, sourceRunId, results, summary }) {
  const lines = [
    "# Live Chatbot Hotspots Rerun",
    "",
    `- Run ID: \`${runId}\``,
    `- Source baseline: \`${sourceRunId}\``,
    `- Cases: ${summary.totalCases}`,
    `- HTTP errors: ${summary.httpErrorCount}`,
    `- Refusals: ${summary.refusalCount}`,
    `- Draft loops: ${summary.draftLoopCount}`,
    `- First text p50/p95: ${summary.firstTextP50Ms ?? "n/a"}ms / ${summary.firstTextP95Ms ?? "n/a"}ms`,
    `- Total p50/p95: ${summary.totalP50Ms ?? "n/a"}ms / ${summary.totalP95Ms ?? "n/a"}ms`,
    "",
    "| Case | Baseline total ms | New total ms | Delta ms | Flags | Prompt |",
    "| --- | ---: | ---: | ---: | --- | --- |",
    ...results.map((result) => {
      const flags = [
        result.httpStatus >= 400 ? `http:${result.httpStatus}` : null,
        result.flags.refusal ? "refusal" : null,
        result.flags.draftLoop ? "draft-loop" : null,
      ].filter(Boolean).join(", ");
      return `| ${result.id} | ${result.baseline.totalMs ?? "n/a"} | ${result.metrics.totalMs ?? "n/a"} | ${result.deltaTotalMs ?? "n/a"} | ${flags || "ok"} | ${result.prompt.replace(/\|/g, "\\|")} |`;
    }),
  ];

  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const sourceRaw = await fs.readFile(options.sourceResults, "utf8");
  const source = JSON.parse(sourceRaw);
  const sourceResults = Array.isArray(source.results) ? source.results : [];
  const selected = options.ids.length
    ? sourceResults.filter((result) => options.ids.includes(result.id))
    : [...sourceResults]
        .sort((a, b) => (b?.metrics?.totalMs ?? 0) - (a?.metrics?.totalMs ?? 0))
        .slice(0, options.count);

  if (!selected.length) {
    throw new Error(`No cases found in ${options.sourceResults}`);
  }

  const { workspaceId, cookieHeader } = await discoverWorkspaceSession(options);
  const results = [];

  for (const baseline of selected) {
    let attempt = 0;
    let latest = null;
    while (attempt < 3) {
      attempt += 1;
      latest = await sendChatRequest({
        baseUrl: options.baseUrl,
        workspaceId,
        cookieHeader,
        prompt: baseline.prompt,
      });
      if (latest.status !== 429) break;
      await sleep((latest.retryAfterMs ?? 3000) + 250);
    }

    results.push({
      id: baseline.id,
      prompt: baseline.prompt,
      tags: baseline.tags ?? [],
      baseline: {
        totalMs: baseline?.metrics?.totalMs ?? null,
        firstTextDeltaMs: baseline?.metrics?.firstTextDeltaMs ?? null,
        assistantText: baseline?.assistantText ?? "",
      },
      httpStatus: latest.status,
      assistantText: latest.assistantText,
      toolOutputs: latest.toolOutputs,
      metrics: {
        totalMs: latest.totalMs,
        firstChunkMs: latest.firstChunkMs,
        firstTextDeltaMs: latest.firstTextDeltaMs,
        serverTiming: latest.serverTiming,
        serverTimingParsed: latest.serverTimingParsed,
      },
      deltaTotalMs: typeof baseline?.metrics?.totalMs === "number" ? latest.totalMs - baseline.metrics.totalMs : null,
      flags: {
        refusal: latest.refusal,
        draftLoop: latest.draftLoop,
        guardrailRespected: latest.guardrailRespected,
      },
      rawSsePreview: latest.raw.slice(0, 1200),
    });

    await sleep(options.delayMs);
  }

  const summary = buildSummary(results);
  const outputDir = path.join(process.cwd(), "test-results", "live-chatbot-regression", options.runId);
  await fs.mkdir(outputDir, { recursive: true });

  const payload = {
    runId: options.runId,
    sourceRunId: source.runId ?? path.basename(path.dirname(options.sourceResults)),
    sourceResults: options.sourceResults,
    baseUrl: options.baseUrl,
    workspaceId,
    generatedAt: new Date().toISOString(),
    summary,
    results,
  };

  await fs.writeFile(path.join(outputDir, "results.json"), JSON.stringify(payload, null, 2));
  await fs.writeFile(path.join(outputDir, "summary.md"), buildMarkdownSummary({
    runId: options.runId,
    sourceRunId: payload.sourceRunId,
    results,
    summary,
  }));
  await fs.writeFile(path.join(process.cwd(), "test-results", "live-chatbot-regression", "latest-hotspots.json"), JSON.stringify(payload, null, 2));

  console.log(`Saved hotspot rerun to ${outputDir}`);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
