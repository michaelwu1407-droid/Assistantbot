import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import { CommissionCalculator } from "@/components/agent/commission-calculator"
import { VendorReportCard } from "@/components/agent/vendor-report-card"
import { PulseWidget } from "@/components/dashboard/pulse-widget"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function AgentPage() {
    const userId = await getAuthUserId()
    
    if (!userId) {
        redirect("/auth")
    }
    
    await getOrCreateWorkspace(userId)

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
