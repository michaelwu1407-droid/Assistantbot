import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import { CommissionCalculator } from "@/components/agent/commission-calculator"
import { VendorReportCard } from "@/components/agent/vendor-report-card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
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
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">Agent pipeline workspace</h2>
                <p className="mt-2 text-sm">
                    The legacy agent dashboard is not the primary workflow right now. Use the CRM dashboard for day-to-day pipeline work while the dedicated agent canvas is being rebuilt.
                </p>
                <Button asChild className="mt-4">
                    <Link href="/crm/dashboard">Open CRM Dashboard</Link>
                </Button>
            </div>
        </div>
    )
}
