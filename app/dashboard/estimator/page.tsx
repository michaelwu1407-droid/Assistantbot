import { redirect } from "next/navigation"
import { getDeals } from "@/actions/deal-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { EstimatorForm } from "@/components/tradie/estimator-form"

export const dynamic = 'force-dynamic'

export default async function EstimatorPage() {
    let workspace, deals;
    let dbError = false;
    try {
        workspace = await getOrCreateWorkspace("demo-user")
        deals = await getDeals(workspace.id)
    } catch {
        dbError = true;
    }

    if (!dbError && workspace && !workspace.onboardingComplete) {
        redirect("/setup")
    }

    if (dbError || !workspace || !deals) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-slate-500">Database not initialized. Please push the schema first.</p>
            </div>
        )
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                    Estimator
                </h2>
            </div>
            <p className="text-slate-500">
                Generate quick quotes on the go. Select a deal, add line items, and create a PDF-ready invoice.
            </p>

            <EstimatorForm deals={deals} />
        </div>
    )
}
