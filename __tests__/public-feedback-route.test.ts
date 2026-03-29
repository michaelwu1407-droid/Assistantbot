import { describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { submitFeedbackFromPublicToken } = vi.hoisted(() => ({
  submitFeedbackFromPublicToken: vi.fn(),
}))

vi.mock("@/actions/feedback-actions", () => ({
  submitFeedbackFromPublicToken,
}))

import { POST } from "@/app/api/public-feedback/route"

describe("POST /api/public-feedback", () => {
  it("rejects invalid payloads", async () => {
    const request = new NextRequest("https://app.example.com/api/public-feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "", score: 11 }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({
      success: false,
      error: "Invalid feedback submission.",
    })
  })

  it("submits valid feedback through the shared action", async () => {
    submitFeedbackFromPublicToken.mockResolvedValue({
      success: true,
      id: "fb_123",
      promptPublicReview: true,
      googleReviewUrl: "https://g.page/example/review",
    })

    const request = new NextRequest("https://app.example.com/api/public-feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "signed-token", score: 9, comment: "Great work" }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(submitFeedbackFromPublicToken).toHaveBeenCalledWith("signed-token", 9, "Great work")
    expect(response.status).toBe(200)
    expect(body).toEqual({
      success: true,
      id: "fb_123",
      promptPublicReview: true,
      googleReviewUrl: "https://g.page/example/review",
    })
  })
})
