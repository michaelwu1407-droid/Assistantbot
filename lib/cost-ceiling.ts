/**
 * Per-provider daily-spend ceiling guard.
 *
 * Wrap any paid outbound call with `withCostCeiling("provider", estimatedCostUsd, fn)`.
 * The wrapper:
 *  - rejects with CostCeilingExceededError if the daily ceiling for that provider has
 *    already been hit (101% protection: refuses outbound traffic so the bill physically
 *    cannot grow),
 *  - emits a [cost-ceiling] warn log + Sentry breadcrumb at 50% / 80% / 100%,
 *  - lets the request through and records the spend after a successful response.
 *
 * State is in-memory per worker process; restart resets the counter. That's intentional
 * — a worker outage that leads to a process restart is already an alert path. For a
 * cluster-wide ceiling, swap the counter for Redis/Vercel KV.
 */

import * as Sentry from "@sentry/nextjs"

export type CostProvider = "openai" | "anthropic" | "cartesia" | "deepgram" | "twilio" | "resend"

export class CostCeilingExceededError extends Error {
  readonly provider: CostProvider
  readonly spentUsd: number
  readonly capUsd: number
  constructor(provider: CostProvider, spentUsd: number, capUsd: number) {
    super(`[cost-ceiling] daily cap reached for ${provider}: $${spentUsd.toFixed(2)} / $${capUsd.toFixed(2)}`)
    this.name = "CostCeilingExceededError"
    this.provider = provider
    this.spentUsd = spentUsd
    this.capUsd = capUsd
  }
}

const DEFAULT_DAILY_CAPS_USD: Record<CostProvider, number> = {
  openai: 50,
  anthropic: 50,
  cartesia: 25,
  deepgram: 25,
  twilio: 25,
  resend: 5,
}

const ceilingState: Record<CostProvider, { dayKey: string; spentUsd: number; warnedAt50: boolean; warnedAt80: boolean }> = {
  openai: emptyBucket(),
  anthropic: emptyBucket(),
  cartesia: emptyBucket(),
  deepgram: emptyBucket(),
  twilio: emptyBucket(),
  resend: emptyBucket(),
}

function emptyBucket() {
  return { dayKey: currentDayKey(), spentUsd: 0, warnedAt50: false, warnedAt80: false }
}

function currentDayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function getCap(provider: CostProvider): number {
  const envKey = `COST_CEILING_${provider.toUpperCase()}_USD`
  const fromEnv = Number(process.env[envKey] || "")
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv
  return DEFAULT_DAILY_CAPS_USD[provider]
}

function rolloverIfNewDay(provider: CostProvider): void {
  const today = currentDayKey()
  if (ceilingState[provider].dayKey !== today) {
    ceilingState[provider] = emptyBucket()
    ceilingState[provider].dayKey = today
  }
}

function recordBreadcrumb(provider: CostProvider, spent: number, cap: number, level: "info" | "warning" | "error") {
  const message = `[cost-ceiling] ${provider}: $${spent.toFixed(2)} / $${cap.toFixed(2)} (${Math.round((spent / cap) * 100)}%)`
  if (level === "error") console.error(message)
  else if (level === "warning") console.warn(message)
  else console.log(message)
  try {
    Sentry.addBreadcrumb({ category: "cost-ceiling", level, message, data: { provider, spent, cap } })
  } catch {
    // Sentry may be unavailable in test/CI; non-fatal.
  }
}

function noteSpend(provider: CostProvider, deltaUsd: number) {
  rolloverIfNewDay(provider)
  const bucket = ceilingState[provider]
  bucket.spentUsd += deltaUsd
  const cap = getCap(provider)
  const ratio = bucket.spentUsd / cap
  if (!bucket.warnedAt50 && ratio >= 0.5) {
    bucket.warnedAt50 = true
    recordBreadcrumb(provider, bucket.spentUsd, cap, "info")
  }
  if (!bucket.warnedAt80 && ratio >= 0.8) {
    bucket.warnedAt80 = true
    recordBreadcrumb(provider, bucket.spentUsd, cap, "warning")
  }
  if (ratio >= 1) {
    recordBreadcrumb(provider, bucket.spentUsd, cap, "error")
  }
}

export async function withCostCeiling<T>(
  provider: CostProvider,
  estimatedCostUsd: number,
  fn: () => Promise<T>,
): Promise<T> {
  rolloverIfNewDay(provider)
  const bucket = ceilingState[provider]
  const cap = getCap(provider)
  if (bucket.spentUsd >= cap) {
    throw new CostCeilingExceededError(provider, bucket.spentUsd, cap)
  }
  const result = await fn()
  noteSpend(provider, estimatedCostUsd)
  return result
}

export function getCostCeilingState(): Record<CostProvider, { spentUsd: number; capUsd: number; ratio: number; dayKey: string }> {
  const out = {} as Record<CostProvider, { spentUsd: number; capUsd: number; ratio: number; dayKey: string }>
  for (const provider of Object.keys(ceilingState) as CostProvider[]) {
    rolloverIfNewDay(provider)
    const bucket = ceilingState[provider]
    const cap = getCap(provider)
    out[provider] = { spentUsd: bucket.spentUsd, capUsd: cap, ratio: bucket.spentUsd / cap, dayKey: bucket.dayKey }
  }
  return out
}

/** For tests only — resets in-process counters. */
export function _resetCostCeilingForTests(): void {
  for (const provider of Object.keys(ceilingState) as CostProvider[]) {
    ceilingState[provider] = emptyBucket()
  }
}
