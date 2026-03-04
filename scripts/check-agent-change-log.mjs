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
  if (EXCLUDED_FILES.has(path)) return false;
  if (EXCLUDED_PREFIXES.some((prefix) => path.startsWith(prefix))) return false;
  return true;
}

const staged = getStagedFiles();
const hasLogUpdate = staged.includes(LOG_PATH);
const hasCodeOrConfigChanges = staged.some(isCodeOrConfigPath);

if (hasCodeOrConfigChanges && !hasLogUpdate) {
  console.error("ERROR: Agent change log entry is required.");
  console.error(`Stage an update to ${LOG_PATH} in the same commit.`);
  process.exit(1);
}

process.exit(0);
