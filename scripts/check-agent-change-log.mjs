#!/usr/bin/env node

import { execSync } from "node:child_process";

function getStagedFiles() {
  const out = execSync("git diff --cached --name-only --diff-filter=ACMR", {
    encoding: "utf8",
  });
  return out
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const LOG_PATH = "docs/agent_change_log.md";
const VOICE_BRIEF_PATH = "docs/voice_operating_brief.md";
const APP_FEATURES_PATH = "APP_FEATURES.md";

const EXCLUDED_PREFIXES = [
  "docs/",
  ".github/",
  ".husky/",
  "scripts/",
  "archive/",
  "livekit-agent/node_modules/",
];

const EXCLUDED_FILES = new Set([
  "CHANGELOG.md",
  "ISSUE_TRACKER.md",
  "AGENTS.md",
  "README.md",
  ".gitignore",
  "pnpm-lock.yaml",
  "package-lock.json",
  "tsconfig.tsbuildinfo",
]);

function isCodeOrConfigPath(path) {
  if (path === LOG_PATH) return false;
  if (path === VOICE_BRIEF_PATH) return false;
  if (path === APP_FEATURES_PATH) return false;
  if (EXCLUDED_FILES.has(path)) return false;
  if (EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;
  return true;
}

const VOICE_AFFECTING_PREFIXES = [
  "livekit-agent/",
  "ops/deploy/",
  "ops/systemd/",
  "lib/voice",
  "lib/livekit-sip",
];

const VOICE_AFFECTING_FILES = new Set([
  ".github/workflows/deploy-livekit.yml",
  "AGENTS.md",
  "app/api/cron/voice-synthetic-probe/route.ts",
  "app/api/internal/voice-fleet-health/route.ts",
  "app/api/internal/voice-calls/route.ts",
  "app/api/webhooks/twilio-voice-gateway/route.ts",
  "lib/agent-mode.ts",
  "lib/customer-agent-readiness.ts",
]);

function isVoiceAffectingPath(path) {
  if (VOICE_AFFECTING_FILES.has(path)) return true;
  return VOICE_AFFECTING_PREFIXES.some((prefix) => path.startsWith(prefix));
}

const staged = getStagedFiles();
const hasLogUpdate = staged.includes(LOG_PATH);
const hasCodeOrConfigChanges = staged.some(isCodeOrConfigPath);
const hasVoiceBriefUpdate = staged.includes(VOICE_BRIEF_PATH);
const hasVoiceAffectingChanges = staged.some(isVoiceAffectingPath);
const hasAppFeaturesUpdate = staged.includes(APP_FEATURES_PATH);

if (hasCodeOrConfigChanges && !hasLogUpdate) {
  console.error("ERROR: Agent change log entry is required.");
  console.error(`Stage an update to ${LOG_PATH} in the same commit.`);
  process.exit(1);
}

if (hasCodeOrConfigChanges && !hasAppFeaturesUpdate) {
  console.error("ERROR: App features update check is mandatory for any code or config edits.");
  console.error(`Stage an update to ${APP_FEATURES_PATH} in the same commit (if no structural change was made, you must still 'touch' or amend the file to assert this).`);
  process.exit(1);
}

if (hasVoiceAffectingChanges && !hasVoiceBriefUpdate) {
  console.error("ERROR: Voice operating brief update is required for voice-affecting changes.");
  console.error(`Stage an update to ${VOICE_BRIEF_PATH} in the same commit.`);
  process.exit(1);
}

process.exit(0);
