"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, ExternalLink, Loader2, MessageSquareText, Star } from "lucide-react"

type PublicFeedbackFormProps = {
  token: string
  businessName: string
  customerName: string
  dealTitle: string
  googleReviewUrl?: string
  existingFeedback?: {
    score: number
    comment: string | null
  } | null
}

export function PublicFeedbackForm({
  token,
  businessName,
  customerName,
  dealTitle,
  googleReviewUrl,
  existingFeedback,
}: PublicFeedbackFormProps) {
  const [score, setScore] = useState<number | null>(existingFeedback?.score ?? null)
  const [comment, setComment] = useState(existingFeedback?.comment ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<{
    promptPublicReview?: boolean
    googleReviewUrl?: string
  } | null>(null)

  const scoreLabel = useMemo(() => {
    if (!score) return ""
    if (score >= 9) return "Excellent"
    if (score >= 7) return "Good"
    if (score >= 5) return "Okay"
    return "Needs work"
  }, [score])

  const handleSubmit = async () => {
    if (!score) {
      setError("Pick a score before submitting.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/public-feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          score,
          comment,
        }),
      })

      const result = (await response.json()) as {
        success: boolean
        error?: string
        promptPublicReview?: boolean
        googleReviewUrl?: string
      }

      if (!response.ok || !result.success) {
        setError(result.error || "Could not submit feedback.")
        return
      }

      setSubmitted({
        promptPublicReview: result.promptPublicReview,
        googleReviewUrl: result.googleReviewUrl,
      })
    } catch {
      setError("Could not submit feedback. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    const showReviewCta = submitted.promptPublicReview && submitted.googleReviewUrl

    return (
      <Card className="rounded-[18px] border-slate-200 shadow-sm">
        <CardContent className="space-y-5 p-6 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-emerald-100 p-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-slate-950">Thanks for the feedback</h2>
              <p className="text-sm leading-6 text-slate-600">
                Your response has been sent to {businessName}. It helps them improve future jobs and follow up
                when something needs attention.
              </p>
            </div>
          </div>

          {showReviewCta ? (
            <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-950">Happy with the result?</p>
              <p className="mt-1 text-sm leading-6 text-emerald-800">
                If you have another minute, you can also leave a public Google review for {businessName}.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button asChild className="rounded-full">
                  <a href={submitted.googleReviewUrl} target="_blank" rel="noopener noreferrer">
                    Leave Google review
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" asChild className="rounded-full">
                  <Link href="/">Done</Link>
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" asChild className="rounded-full">
              <Link href="/">Done</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-[18px] border-slate-200 shadow-sm">
      <CardHeader className="space-y-2 p-6 sm:p-8">
        <div className="flex items-center gap-2 text-amber-500">
          <Star className="h-5 w-5 fill-current" />
          <Star className="h-5 w-5 fill-current" />
          <Star className="h-5 w-5 fill-current" />
          <Star className="h-5 w-5 fill-current" />
          <Star className="h-5 w-5 fill-current" />
        </div>
        <CardTitle className="text-2xl font-semibold text-slate-950">How did we do?</CardTitle>
        <CardDescription className="text-sm leading-6 text-slate-600">
          Hi {customerName}. Please rate your experience with {businessName} for <span className="font-medium text-slate-900">{dealTitle}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 p-6 pt-0 sm:p-8 sm:pt-0">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 10 }, (_, index) => {
              const value = index + 1
              const selected = score === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScore(value)}
                  className={[
                    "flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                    selected
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                  ].join(" ")}
                  aria-pressed={selected}
                >
                  {value}
                </button>
              )
            })}
          </div>
          <p className="text-sm text-slate-600">{score ? `${score}/10 · ${scoreLabel}` : "1 = poor, 10 = excellent"}</p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <MessageSquareText className="h-4 w-4 text-slate-500" />
            Anything you want them to know?
          </label>
          <Textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Optional comment"
            rows={4}
            className="min-h-[120px] rounded-[18px] border-slate-200 bg-slate-50 px-4 py-3"
          />
        </div>

        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

        <Button onClick={handleSubmit} disabled={submitting} className="rounded-full">
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending feedback...
            </>
          ) : (
            "Submit feedback"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
