import { getTradieJobs } from "@/actions/tradie-actions"
import TradieDashboard from "./client-page"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { JobBottomSheet } from "@/components/tradie/job-bottom-sheet";
import { PulseWidget } from "@/components/dashboard/pulse-widget";
import { getAuthUserId } from "@/lib/auth";

// Force dynamic since we fetch user-specific data
export const dynamic = "force-dynamic"

export default async function TradiePage() {
    const userId = await getAuthUserId()
    const workspace = await getOrCreateWorkspace(userId)
    const jobs = await getTradieJobs(workspace.id)

    return <TradieDashboard initialJobs={jobs} />
}
