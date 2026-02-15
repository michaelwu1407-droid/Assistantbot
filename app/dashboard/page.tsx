import { redirect } from "next/navigation"
import { getDeals } from "@/actions/deal-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { getAuthUser } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    let workspace, deals;
    let dbError = false;

    // 1. Get User
    const authUser = await getAuthUser()
    const userId = authUser.id
    const userName = authUser.name

    try {
        workspace = await getOrCreateWorkspace(userId)
        deals = await getDeals(workspace.id)
    } catch {
        dbError = true;
    }

    // Redirect must be outside try/catch — Next.js redirect() throws internally
    if (!dbError && workspace && !workspace.onboardingComplete) {
        redirect("/setup")
    }

    if (dbError || !workspace || !deals) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 gap-4">
                <div className="max-w-sm w-full rounded-xl border border-amber-200 bg-amber-50 p-5 text-center space-y-2">
                    <h3 className="text-sm font-semibold text-amber-800">Database connection unavailable</h3>
                    <p className="text-xs text-amber-600">
                        CRM features (deals, contacts, kanban) need a database connection.
                        The chatbot is still available in the sidebar.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <DashboardClient
            workspace={workspace}
            deals={deals}
            userName={userName}
            userId={userId}
        />
    )
}
