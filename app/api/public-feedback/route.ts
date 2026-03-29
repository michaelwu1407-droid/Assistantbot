import { submitFeedbackFromPublicToken } from "@/actions/feedback-actions"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const PublicFeedbackSchema = z.object({
  token: z.string().min(1),
  score: z.number().int().min(1).max(10),
  comment: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = PublicFeedbackSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid feedback submission." },
        { status: 400 },
      )
    }

    const result = await submitFeedbackFromPublicToken(
      parsed.data.token,
      parsed.data.score,
      parsed.data.comment,
    )

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: "Could not submit feedback." },
      { status: 500 },
    )
  }
}
