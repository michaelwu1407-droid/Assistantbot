"use server"

import { getDeals } from "@/actions/deal-actions"
import { EstimatorForm } from "@/components/tradie/estimator-form"

// Mock Workspace ID for now - in production this comes from auth context
const WORKSPACE_ID = "demo-workspace"

export default async function EstimatorPage() {
    // Fetch deals to populate the selector
    // We only want active deals ideally, but getDeals returns all
    const deals = await getDeals(WORKSPACE_ID)

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
