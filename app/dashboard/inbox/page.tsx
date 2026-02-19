import { redirect } from "next/navigation"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUser } from "@/lib/auth"
import { InboxView } from "@/components/crm/inbox-view"
import { getActivities } from "@/actions/activity-actions"

export const dynamic = "force-dynamic"

export default async function InboxPage() {
    const authUser = await getAuthUser()
    if (!authUser) redirect("/login")

    let interactions
    try {
        const workspace = await getOrCreateWorkspace(authUser.id)
        interactions = await getActivities({
            workspaceId: workspace.id,
            typeIn: ["CALL", "EMAIL", "NOTE"],
            limit: 80,
        })
    } catch {
        return (
            <div className="h-full flex items-center justify-center p-8">
                <div className="max-w-sm w-full rounded-xl border border-amber-200 bg-amber-50 p-5 text-center space-y-2">
                    <h3 className="text-sm font-semibold text-amber-800">Database connection unavailable</h3>
                    <p className="text-xs text-amber-600">Could not load inbox. Please try again later.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <InboxView initialInteractions={interactions} />
        </div>
    )
}
