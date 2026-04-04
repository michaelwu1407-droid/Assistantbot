import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { buildLiveChatbotWorkflows } from "./live-chatbot-workflows.mjs";

const DEFAULT_DEBUG_URL = process.env.CHROME_DEBUG_URL || "http://127.0.0.1:9222";
const DEFAULT_BASE_URL = process.env.LIVE_CHATBOT_BASE_URL || "https://www.earlymark.ai";
const DEFAULT_LIMIT = Number(process.env.LIVE_CHATBOT_LIMIT || 100);

function formatRunId() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

function parseArgs(argv) {
  const options = {
    debugUrl: DEFAULT_DEBUG_URL,
    baseUrl: DEFAULT_BASE_URL,
    limit: DEFAULT_LIMIT,
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
    } else if (arg === "--limit" && next) {
      options.limit = Number(next);
      i += 1;
    } else if (arg === "--run-id" && next) {
      options.runId = next;
      i += 1;
    }
  }

  return options;
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
  return /here(?:'|’)s what i got|edit anything before confirming/i.test(text);
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
      // ignore malformed chunks
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
  await page.goto(`${baseUrl}/crm/dashboard#live-chatbot-regression-probe`, { waitUntil: "domcontentloaded" });
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

async function sendChatRequest({ baseUrl, workspaceId, cookieHeader, messages }) {
  const start = Date.now();
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
      cookie: cookieHeader,
    },
    body: JSON.stringify({ workspaceId, messages }),
  });

  const serverTiming = response.headers.get("server-timing");
  const contentType = response.headers.get("content-type");
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
    contentType,
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

function toUiMessage(role, text) {
  return {
    role,
    parts: [{ type: "text", text }],
  };
}

function buildMarkdownSummary({ runId, baseUrl, workspaceId, results, summary }) {
  const slowest = [...results]
    .sort((a, b) => (b.metrics.totalMs ?? 0) - (a.metrics.totalMs ?? 0))
    .slice(0, 10);
  const worstFailures = results.filter((result) => result.flags.refusal || result.flags.draftLoop || result.httpStatus >= 400).slice(0, 20);

  const lines = [
    `# Live Chatbot Regression`,
    ``,
    `- Run ID: \`${runId}\``,
    `- Base URL: \`${baseUrl}\``,
    `- Workspace ID: \`${workspaceId}\``,
    `- Cases: ${summary.totalCases}`,
    `- HTTP errors: ${summary.httpErrorCount}`,
    `- Refusals: ${summary.refusalCount}`,
    `- Draft loops: ${summary.draftLoopCount}`,
    `- Guardrail acknowledgements: ${summary.guardrailCount}`,
    `- First chunk p50/p95: ${summary.firstChunkP50Ms ?? "n/a"}ms / ${summary.firstChunkP95Ms ?? "n/a"}ms`,
    `- First text p50/p95: ${summary.firstTextP50Ms ?? "n/a"}ms / ${summary.firstTextP95Ms ?? "n/a"}ms`,
    `- Total p50/p95: ${summary.totalP50Ms ?? "n/a"}ms / ${summary.totalP95Ms ?? "n/a"}ms`,
    ``,
    `## Slowest Cases`,
    ``,
    `| Case | Tags | Total ms | First text ms | Prompt |`,
    `| --- | --- | ---: | ---: | --- |`,
    ...slowest.map((result) => `| ${result.id} | ${result.tags.join(", ")} | ${result.metrics.totalMs ?? "n/a"} | ${result.metrics.firstTextDeltaMs ?? "n/a"} | ${result.prompt.replace(/\|/g, "\\|")} |`),
    ``,
    `## Notable Failures`,
    ``,
    `| Case | Flags | Prompt | Assistant text |`,
    `| --- | --- | --- | --- |`,
    ...worstFailures.map((result) => {
      const flags = [
        result.httpStatus >= 400 ? `http:${result.httpStatus}` : null,
        result.flags.refusal ? "refusal" : null,
        result.flags.draftLoop ? "draft-loop" : null,
      ].filter(Boolean).join(", ");
      return `| ${result.id} | ${flags || "n/a"} | ${result.prompt.replace(/\|/g, "\\|")} | ${(result.assistantText || "").replace(/\|/g, "\\|").slice(0, 180)} |`;
    }),
  ];

  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const workflows = buildLiveChatbotWorkflows(options.runId).slice(0, options.limit);
  const { workspaceId, cookieHeader } = await discoverWorkspaceSession(options);

  const results = [];
  const conversation = [];
  const outputDir = path.join(process.cwd(), "test-results", "live-chatbot-regression", options.runId);
  await fs.mkdir(outputDir, { recursive: true });

  for (const workflow of workflows) {
    const userMessage = toUiMessage("user", workflow.prompt);
    const response = await sendChatRequest({
      baseUrl: options.baseUrl,
      workspaceId,
      cookieHeader,
      messages: [...conversation, userMessage],
    });

    const assistantText = response.assistantText || "[no assistant text returned]";
    const assistantMessage = toUiMessage("assistant", assistantText);
    conversation.push(userMessage, assistantMessage);

    const result = {
      id: workflow.id,
      prompt: workflow.prompt,
      tags: workflow.tags,
      httpStatus: response.status,
      assistantText,
      toolOutputs: response.toolOutputs,
      metrics: {
        totalMs: response.totalMs,
        firstChunkMs: response.firstChunkMs,
        firstTextDeltaMs: response.firstTextDeltaMs,
        serverTiming: response.serverTiming,
        serverTimingParsed: response.serverTimingParsed,
      },
      flags: {
        refusal: response.refusal,
        draftLoop: response.draftLoop,
        guardrailRespected: response.guardrailRespected,
      },
      rawSsePreview: response.raw.slice(0, 4000),
    };
    results.push(result);

    process.stdout.write(
      `[${workflow.id}/${String(workflows.length).padStart(3, "0")}] ${response.status} ${response.totalMs}ms ${response.firstTextDeltaMs ?? "n/a"}ms-first-text ${workflow.prompt.slice(0, 88)}\n`,
    );
  }

  const firstChunkValues = results.map((result) => result.metrics.firstChunkMs).filter((value) => Number.isFinite(value));
  const firstTextValues = results.map((result) => result.metrics.firstTextDeltaMs).filter((value) => Number.isFinite(value));
  const totalValues = results.map((result) => result.metrics.totalMs).filter((value) => Number.isFinite(value));

  const summary = {
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

  const payload = {
    runId: options.runId,
    baseUrl: options.baseUrl,
    workspaceId,
    generatedAt: new Date().toISOString(),
    summary,
    results,
  };

  const jsonPath = path.join(outputDir, "results.json");
  const latestJsonPath = path.join(process.cwd(), "test-results", "live-chatbot-regression", "latest.json");
  const markdownPath = path.join(outputDir, "summary.md");
  const latestMarkdownPath = path.join(process.cwd(), "test-results", "live-chatbot-regression", "latest-summary.md");

  await fs.writeFile(jsonPath, JSON.stringify(payload, null, 2));
  await fs.writeFile(latestJsonPath, JSON.stringify(payload, null, 2));

  const markdown = buildMarkdownSummary({
    runId: options.runId,
    baseUrl: options.baseUrl,
    workspaceId,
    results,
    summary,
  });

  await fs.writeFile(markdownPath, markdown);
  await fs.writeFile(latestMarkdownPath, markdown);

  process.stdout.write(`\nSaved JSON: ${jsonPath}\nSaved summary: ${markdownPath}\n`);
  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
