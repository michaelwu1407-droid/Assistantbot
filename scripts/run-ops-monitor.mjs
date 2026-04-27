#!/usr/bin/env node

import { appendFileSync } from "node:fs";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    headers: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--path") {
      args.path = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--label") {
      args.label = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--deadman-url") {
      args.deadmanUrl = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === "--header") {
      args.headers.push(argv[index + 1]);
      index += 1;
      continue;
    }

    fail(`Unknown argument: ${token}`);
  }

  if (!args.path) fail("--path is required");
  if (!args.label) fail("--label is required");

  return args;
}

function buildUrl(baseUrl, path) {
  const normalizedBase = (baseUrl || "").trim().replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function parseExtraHeaders(values) {
  const headers = {};

  for (const value of values) {
    const separatorIndex = value.indexOf("=");
    if (separatorIndex <= 0) {
      fail(`Invalid --header value: ${value}. Expected name=value.`);
    }

    const name = value.slice(0, separatorIndex).trim();
    const headerValue = value.slice(separatorIndex + 1);

    if (!name) {
      fail(`Invalid --header value: ${value}. Header name is required.`);
    }

    headers[name] = headerValue;
  }

  return headers;
}

function appendStepSummary(lines) {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (!target) return;

  const content = `${lines.join("\n")}\n`;
  appendFileSync(target, content, "utf8");
}

function emitWorkflowMessage(level, message) {
  const prefix = level === "warning" ? "::warning::" : level === "error" ? "::error::" : "::notice::";
  console.log(`${prefix}${message}`);
}

async function pingDeadman(deadmanUrl) {
  if (!deadmanUrl) return;

  const response = await fetch(deadmanUrl, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    fail(`Deadman ping failed with HTTP ${response.status}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const appBaseUrl = (process.env.APP_BASE_URL || "").trim();
  const cronSecret = (process.env.CRON_SECRET || "").trim();
  const opsKey = (process.env.OPS_KEY || cronSecret).trim();

  if (!appBaseUrl) fail("APP_BASE_URL is required.");
  if (!cronSecret) fail("CRON_SECRET is required.");

  const url = buildUrl(appBaseUrl, args.path);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "x-ops-key": opsKey,
      ...parseExtraHeaders(args.headers),
    },
    cache: "no-store",
  });

  const rawBody = await response.text();
  console.log(rawBody);

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    fail(
      `${args.label} returned HTTP ${response.status}, but the body was not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  const status = typeof payload?.status === "string" ? payload.status : null;
  const summary = typeof payload?.summary === "string"
    ? payload.summary
    : typeof payload?.error === "string"
      ? payload.error
      : `HTTP ${response.status}`;
  const primaryIssue = payload?.monitorHealth?.details?.primaryIssue || payload?.primaryIssue || null;
  const primaryIssueSummary =
    primaryIssue && typeof primaryIssue === "object" && typeof primaryIssue.summary === "string"
      ? primaryIssue.summary
      : null;

  appendStepSummary([
    `### ${args.label}`,
    "",
    `- HTTP: ${response.status}`,
    `- Status: ${status || "unknown"}`,
    `- Summary: ${summary}`,
    ...(primaryIssueSummary ? [`- Primary issue: ${primaryIssueSummary}`] : []),
  ]);

  if (status === "healthy") {
    emitWorkflowMessage("notice", `${args.label} is healthy: ${summary}`);
    await pingDeadman(args.deadmanUrl);
    return;
  }

  if (status === "degraded" || status === "unhealthy") {
    emitWorkflowMessage(
      "warning",
      `${args.label} reported ${status}: ${primaryIssueSummary ? `${primaryIssueSummary} (${summary})` : summary}`,
    );
    await pingDeadman(args.deadmanUrl);
    return;
  }

  if (response.status === 401 || response.status === 403) {
    fail(`${args.label} authorization failed with HTTP ${response.status}`);
  }

  if (!response.ok) {
    fail(`${args.label} failed with HTTP ${response.status}: ${summary}`);
  }

  fail(`${args.label} returned an unrecognized payload status: ${status || "missing"}`);
}

await main();
