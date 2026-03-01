import { redirect } from "next/navigation"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUser } from "@/lib/auth"
import { InboxView } from "@/components/crm/inbox-view"
import { getActivities } from "@/actions/activity-actions"
import { getContacts } from "@/actions/contact-actions"
import { isManagerOrAbove } from "@/lib/rbac"

export const dynamic = "force-dynamic"

const EXISTING_STAGES = ["SCHEDULED", "PIPELINE", "INVOICED", "WON"] as const

export default async function InboxPage() {
    const authUser = await getAuthUser()
    if (!authUser) redirect("/login")

    // RBAC: Team members cannot access the global inbox
    if (!(await isManagerOrAbove())) {
        redirect("/dashboard")
    }

    let interactions
    let contactSegment: Record<string, "lead" | "existing"> = {}
    let workspaceId: string | undefined
    try {
        const workspace = await getOrCreateWorkspace(authUser.id)
        workspaceId = workspace.id
        const [activities, contacts] = await Promise.all([
            getActivities({
                workspaceId: workspace.id,
                typeIn: ["CALL", "EMAIL", "NOTE"],
                limit: 80,
            }),
            getContacts(workspace.id),
        ])
        interactions = activities
        for (const c of contacts) {
            contactSegment[c.id] = EXISTING_STAGES.includes(
                (c.primaryDealStageKey ?? "") as (typeof EXISTING_STAGES)[number]
            )
                ? "existing"
                : "lead"
        }
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
            <InboxView initialInteractions={interactions} contactSegment={contactSegment} workspaceId={workspaceId} />
        </div>
    )
}
