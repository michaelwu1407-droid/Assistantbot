import { describe, expect, it } from "vitest"
import { formatInvoiceStatusLabel, formatJobHeaderStatus } from "@/lib/job-portal-status-labels"

describe("formatJobHeaderStatus", () => {
  it("maps field job statuses", () => {
    expect(formatJobHeaderStatus("TRAVELING")).toBe("On the way")
    expect(formatJobHeaderStatus("ON_SITE")).toBe("On site")
    expect(formatJobHeaderStatus("COMPLETED")).toBe("Completed")
  })

  it("delegates deal stages to user-facing labels", () => {
    expect(formatJobHeaderStatus("WON")).toBe("Completed")
    expect(formatJobHeaderStatus("INVOICED")).toBe("Awaiting payment")
  })

  it("returns empty for empty input", () => {
    expect(formatJobHeaderStatus("")).toBe("")
  })
})

describe("formatInvoiceStatusLabel", () => {
  it("maps common invoice statuses", () => {
    expect(formatInvoiceStatusLabel("PAID")).toBe("Paid")
    expect(formatInvoiceStatusLabel("ISSUED")).toBe("Issued")
    expect(formatInvoiceStatusLabel("DRAFT")).toBe("Draft")
  })

  it("passes through unknown codes", () => {
    expect(formatInvoiceStatusLabel("CUSTOM")).toBe("CUSTOM")
  })
})
