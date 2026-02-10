import { getFreshLeads, getAgentPipeline, AgentLead } from "@/actions/agent-actions"
import AgentDashboard from "./client-page"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { SpeedToLeadWidget } from "@/components/agent/speed-to-lead"
import { CommissionCalculator } from "@/components/agent/commission-calculator"
import { VendorReportCard } from "@/components/agent/vendor-report-card"
import { PulseWidget } from "@/components/dashboard/pulse-widget"
import { getAuthUserId } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function AgentPage() {
    const userId = await getAuthUserId()
    const workspace = await getOrCreateWorkspace(userId)

    // Parallel fetching
    const [freshLeads, pipeline] = await Promise.all([
        getFreshLeads(workspace.id),
        getAgentPipeline(workspace.id)
    ])

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-32">
            <PulseWidget mode="agent" />

            <div className="flex items-center justify-between">
                <CommissionCalculator />
                <VendorReportCard />
            </div>

            {/* Pipeline and List Canvas */}
        </div>
    )
}
