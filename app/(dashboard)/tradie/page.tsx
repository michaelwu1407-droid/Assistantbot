import { getTradieJobs } from "@/actions/tradie-actions"
import TradieDashboard from "./client-page"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"

// Force dynamic since we fetch user-specific data
export const dynamic = "force-dynamic"

export default async function TradiePage() {
    // In a real app complexity, we'd get the user session here.
    // For demo simplicity, we'll fetch default workspace or similar.
    // We can reuse the same "demo-user" logic from AssistantPane or check headers.
    // Let's assume a default workspace for now.

    const workspace = await getOrCreateWorkspace("demo-user")
    const jobs = await getTradieJobs(workspace.id)

    return <TradieDashboard initialJobs={jobs} />
}
