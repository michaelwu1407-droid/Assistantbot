import { redirect } from "next/navigation"
import { getDeals } from "@/actions/deal-actions"
import { getOrCreateWorkspace, ensureOwnerHasUserRow } from "@/actions/workspace-actions"
import { getTeamMembers } from "@/actions/invite-actions"
import { DashboardClient } from "@/components/dashboard/dashboard-client"
import { getAuthUser } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export default async function DashboardPage(props: {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
    // Next.js 16: searchParams is a Promise; unwrap so it isn't serialized to client
    if (props.searchParams) await props.searchParams

    let workspace, deals;
    let teamMembers: { id: string; name: string | null; email: string; role: string; isCurrentUser?: boolean }[] = []
    let dbError = false;

    // 1. Get User
    const authUser = await getAuthUser()
    
    // Redirect if not authenticated
    if (!authUser) {
        redirect("/auth")
    }

    const userId = authUser.id
    let userName = authUser.name

    try {
        workspace = await getOrCreateWorkspace(userId)
        // Run independent queries in parallel once workspace is available
        const [, dealsResult, teamResult] = await Promise.all([
            ensureOwnerHasUserRow(workspace),
            getDeals(workspace.id),
            getTeamMembers(),
        ])
        deals = dealsResult
        teamMembers = teamResult
        const currentMember = teamMembers.find((m) => m.isCurrentUser)
        if (currentMember?.name?.trim()) {
            userName = currentMember.name
        }
    } catch (error) {
        console.error("DashboardPage failed to load:", error);
        dbError = true;
    }

    // Note: Auth flow already handles subscription and onboarding redirects
    // Users should only reach here if they have active subscriptions
    
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
            teamMembers={teamMembers}
            userName={userName}
            userId={userId}
        />
    )
}
