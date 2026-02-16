import { getFreshLeads, getAgentPipeline, AgentLead } from "@/actions/agent-actions"
import { getDeals } from "@/actions/deal-actions"
import { getFinancialStats } from "@/actions/dashboard-actions"
import AgentDashboard from "./client-page"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId, getAuthUser } from "@/lib/auth"
import { SpeedToLeadWidget } from "@/components/agent/speed-to-lead"
import { CommissionCalculator } from "@/components/agent/commission-calculator"
import { VendorReportCard } from "@/components/agent/vendor-report-card"
import { PulseWidget } from "@/components/dashboard/pulse-widget"

export const dynamic = "force-dynamic"

export default async function AgentPage() {
    const userId = await getAuthUserId()
    
    if (!userId) {
        throw new Error("User not authenticated");
    }
    
    const workspace = await getOrCreateWorkspace(userId)
    const authUser = await getAuthUser()
    const userName = authUser?.name || "User"

    // Parallel fetching
    const [freshLeads, pipeline] = await Promise.all([
        getFreshLeads(workspace.id),
        getAgentPipeline(workspace.id)
    ])

    let listings: any[] = []
    let leads: any[] = []

    try {
        listings = await getDeals(workspace.id)
        leads = freshLeads
    } catch (error) {
        console.error("Failed to fetch listings:", error)
    }

    // Get financial stats
    let financialStats = undefined
    try {
        financialStats = await getFinancialStats(workspace.id)
    } catch (error) {
        console.error("Failed to fetch financial stats:", error)
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 pb-32">
            <PulseWidget mode="agent" />

            <div className="flex items-center justify-between">
                <CommissionCalculator />
                <VendorReportCard />
            </div>

            {/* Pipeline and List Canvas */}
            {/* <AgentDashboard 
                workspaceId={workspace.id}
                listings={listings}
                leads={leads}
                pipeline={pipeline}
                userId={userId}
                userName={userName}
                financialStats={financialStats}
                vendorReport={null}
            /> */}
            <div className="text-center text-muted-foreground">
                <p>Agent Dashboard temporarily disabled due to TypeScript error</p>
            </div>
        </div>
    )
}
