import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  CostCeilingExceededError,
  _resetCostCeilingForTests,
  getCostCeilingState,
  withCostCeiling,
} from "@/lib/cost-ceiling"

vi.mock("@sentry/nextjs", () => ({ addBreadcrumb: vi.fn() }))

const ORIGINAL_CAP = process.env.COST_CEILING_TWILIO_USD

beforeEach(() => {
  _resetCostCeilingForTests()
  process.env.COST_CEILING_TWILIO_USD = "1"
})

afterEach(() => {
  if (ORIGINAL_CAP === undefined) delete process.env.COST_CEILING_TWILIO_USD
  else process.env.COST_CEILING_TWILIO_USD = ORIGINAL_CAP
})

describe("withCostCeiling", () => {
  it("lets a request through and records the spend", async () => {
    const fn = vi.fn(async () => "ok")
    await expect(withCostCeiling("twilio", 0.3, fn)).resolves.toBe("ok")
    expect(getCostCeilingState().twilio.spentUsd).toBeCloseTo(0.3)
  })

  it("refuses outbound traffic once daily cap is reached", async () => {
    await withCostCeiling("twilio", 0.6, async () => "ok")
    await withCostCeiling("twilio", 0.5, async () => "ok") // pushes over $1
    expect(getCostCeilingState().twilio.spentUsd).toBeGreaterThanOrEqual(1)

    const fn = vi.fn(async () => "should not run")
    await expect(withCostCeiling("twilio", 0.1, fn)).rejects.toBeInstanceOf(CostCeilingExceededError)
    expect(fn).not.toHaveBeenCalled()
  })

  it("does not record spend if the wrapped call throws", async () => {
    const fn = vi.fn(async () => {
      throw new Error("twilio 500")
    })
    await expect(withCostCeiling("twilio", 0.4, fn)).rejects.toThrow("twilio 500")
    expect(getCostCeilingState().twilio.spentUsd).toBe(0)
  })
})
