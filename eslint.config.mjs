import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ─── Design Policy Rules ───────────────────────────────────────────────────
// Enforces the Global Formatting & Design Policy defined in CLAUDE.md.
//
// Regex strategy for Tailwind class patterns:
//   (?<![a-z:]) negative lookbehind so dark:bg-slate-* variants are NOT flagged.
//   Intentional dark surfaces are the only exception per the policy.

const twClassRule = (pattern, message) => ({
  selector: `Literal[value=/${pattern}/]`,
  message,
});

const tailwindRules = [
  // 1. Arbitrary border radius — always use rounded-md.
  twClassRule(
    "rounded-\\[",
    "Use rounded-md instead of arbitrary pixel radius. globals.css forces all variants to 18px."
  ),
  // 2. Red palette (light-mode) — use destructive token.
  twClassRule(
    "(?<![a-z:])(text|bg|border|ring|shadow)-red-",
    "Use text-destructive / border-destructive / bg-destructive instead of the red palette."
  ),
  // 3. Slate palette (light-mode) — use semantic tokens.
  //    Exception: text-slate-body and text-slate-heading ARE design tokens defined in globals.css.
  twClassRule(
    "(?<![a-z:])(text|bg|border|ring)-slate-(?!body|heading)",
    "Use text-foreground / text-muted-foreground / border-border / bg-muted / bg-card instead of slate-* values. (text-slate-body and text-slate-heading are valid design tokens.)"
  ),
  // 4. Gray palette (light-mode) — use semantic tokens.
  twClassRule(
    "(?<![a-z:])(text|bg|border|ring)-gray-",
    "Use text-foreground / text-muted-foreground / border-border / bg-muted / bg-card instead of gray-* values."
  ),
  // 5. Per-element focus rings — the global *:focus-visible rule handles this.
  twClassRule(
    "focus(-visible)?:ring-(?!0\\b|none)",
    "Remove per-element focus rings. The global *:focus-visible { box-shadow: var(--shadow-focus) } handles focus. Use focus-visible:outline-none only for custom focus handling."
  ),
];

// Locale method restrictions — use lib/format.ts or lib/timezone.ts helpers.
const localeMethodRules = [
  "error",
  {
    property: "toLocaleString",
    message: "Use formatCurrency (money) or formatDateTime/formatDateTimeInTimezone from lib/format or lib/timezone.",
  },
  {
    property: "toLocaleDateString",
    message: "Use formatDate / formatShortDate from lib/format or formatMonthDayYearInTimezone from lib/timezone.",
  },
  {
    property: "toLocaleTimeString",
    message: "Use formatTime from lib/format or formatTimeInTimezone from lib/timezone.",
  },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "__tests__/**",
    "e2e/**",
    "prisma/**",
    "public/**",
    "instrumentation*.ts",
    "sentry.*.config.ts",
    // Decorative illustration — uses progressive border-radii for phone bezel fidelity
    "components/home/PulsingLogo.js",
  ]),

  // UI source files — full design policy (Tailwind classes + locale methods).
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", ...tailwindRules],
      "no-restricted-properties": localeMethodRules,
    },
  },

  // lib/ — Tailwind class rules only; locale methods are used in format/timezone helpers.
  {
    files: ["lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", ...tailwindRules],
    },
  },

  // actions/ — locale method rule only (server actions may have inline date output for AI).
  // Tailwind classes don't appear in server actions, so no class rules needed.
  {
    files: ["actions/**/*.ts"],
    rules: {
      "no-restricted-properties": localeMethodRules,
    },
  },

  // Format and timezone implementations — exempt from locale method rule
  // (they implement the helpers everyone else must use).
  {
    files: ["lib/format.ts", "lib/timezone.ts"],
    rules: {
      "no-restricted-properties": "off",
    },
  },
]);

export default eslintConfig;
