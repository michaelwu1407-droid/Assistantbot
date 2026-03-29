import { getPublicFeedbackContext } from "@/actions/feedback-actions"
import { PublicFeedbackForm } from "@/components/feedback/public-feedback-form"
import { notFound } from "next/navigation"

type FeedbackPageProps = {
  params: Promise<{
    token: string
  }>
}

export default async function PublicFeedbackPage({ params }: FeedbackPageProps) {
  const { token } = await params
  const feedbackContext = await getPublicFeedbackContext(token)

  if (!feedbackContext) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="space-y-2 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Earlymark feedback</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Share your experience</h1>
          <p className="text-sm leading-6 text-slate-600">
            This goes directly to {feedbackContext.businessName}. If something missed the mark, they can fix it quickly.
          </p>
        </div>

        <PublicFeedbackForm
          token={token}
          businessName={feedbackContext.businessName}
          customerName={feedbackContext.contactName}
          dealTitle={feedbackContext.dealTitle}
          googleReviewUrl={feedbackContext.googleReviewUrl || undefined}
          existingFeedback={
            feedbackContext.existingFeedback
              ? {
                  score: feedbackContext.existingFeedback.score,
                  comment: feedbackContext.existingFeedback.comment,
                }
              : null
          }
        />
      </div>
    </main>
  )
}
