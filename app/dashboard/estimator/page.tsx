import { getDeals } from "@/actions/deal-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import { EstimatorForm } from "@/components/tradie/estimator-form"

export const dynamic = "force-dynamic"

export default async function EstimatorPage() {
    const userId = (await getAuthUserId()) as string;
    const workspace = await getOrCreateWorkspace(userId)
    const deals = await getDeals(workspace.id)

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <EstimatorForm deals={deals} workspaceId={workspace.id} />
        </div>
    )
}

