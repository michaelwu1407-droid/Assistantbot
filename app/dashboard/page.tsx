import { getDeals } from "@/actions/deal-actions"
import { getActivities } from "@/actions/activity-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import DashboardClientPage from "./client-page"

export default async function DashboardPage() {
    // In a real app, we'd get the user ID from the session
    const workspace = await getOrCreateWorkspace("demo-user")
    
    const [deals, activities] = await Promise.all([
        getDeals(workspace.id),
        getActivities({ workspaceId: workspace.id })
    ])

    return (
        <DashboardClientPage 
            deals={deals} 
            activities={activities} 
            workspaceId={workspace.id} 
        />
    )
}
