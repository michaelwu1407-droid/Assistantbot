# Live Chatbot Regression

This is the saved live regression harness for Tracey's CRM chat behavior.

## What It Does

- Reuses the currently signed-in visible Chrome session via remote debugging.
- Discovers the live `workspaceId` from the CRM page.
- Runs the saved 100-message CRM workflow suite against the real `/api/chat` endpoint.
- Records latency and output artifacts for every message:
  - HTTP status
  - first chunk latency
  - first text-token latency
  - total response time
  - assistant text
  - tool outputs
  - refusal / draft-loop heuristics

## Prerequisites

1. Chrome is already open with your real signed-in Earlymark session.
2. Chrome is running with remote debugging on `http://127.0.0.1:9222`.
3. The target environment is the live CRM at `https://www.earlymark.ai` unless overridden.

## Run It

```bash
npm run test:live:chatbot
```

Optional overrides:

```bash
node scripts/run-live-chatbot-regression.mjs --base-url https://www.earlymark.ai --debug-url http://127.0.0.1:9222 --limit 25 --delay-ms 2100 --run-id manualcheck01
```

The runner now self-throttles between prompts and will retry once on `429 Too Many Requests` using the server's `Retry-After` hint. The default pacing is `2100ms` between prompts so the full 100-case suite stays below the live chat API's `30 requests / minute` rate limit.

## Output

Artifacts are written to:

- `test-results/live-chatbot-regression/<run-id>/results.json`
- `test-results/live-chatbot-regression/<run-id>/summary.md`
- `test-results/live-chatbot-regression/latest.json`
- `test-results/live-chatbot-regression/latest-summary.md`

## Workflow Suite

The saved suite is generated in:

- `scripts/live-chatbot-workflows.mjs`

It intentionally contains exactly 100 CRM-oriented prompts, covering:

- contact creation and lookup
- job creation and stage changes
- notes, reminders, and context lookups
- quote / invoice flows
- attention and reporting queries
- Bouncer policy questions
- undo / restore / audit behavior

## Reading Latency

Primary latency metrics captured per prompt:

- `firstChunkMs`: first bytes from `/api/chat`
- `firstTextDeltaMs`: first assistant text token seen in the SSE stream
- `totalMs`: full streamed response completion

Use the summary p50 and p95 values to spot regressions in typical and tail latency.
