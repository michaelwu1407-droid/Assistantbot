import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import { getWorkspaceFeedback } from "@/actions/feedback-actions"
import { FeedbackWidget } from "@/components/crm/feedback-widget"

export const dynamic = "force-dynamic"

export default async function FeedbackPage() {
    const userId = (await getAuthUserId()) as string;
    const workspace = await getOrCreateWorkspace(userId)
    const feedback = await getWorkspaceFeedback(workspace.id)

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Customer Feedback</h1>
                <p className="text-slate-500 text-sm mt-1">Monitor satisfaction scores and resolve issues before they become public reviews.</p>
            </div>
            <FeedbackWidget feedback={feedback} />
        </div>
    )
}

