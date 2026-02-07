import { getFreshLeads, getAgentPipeline, AgentLead } from "@/actions/agent-actions"
import AgentDashboard from "./client-page"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"

export const dynamic = "force-dynamic"

export default async function AgentPage() {
    const workspace = await getOrCreateWorkspace("demo-user")

    // Parallel fetching
    const [freshLeads, pipeline] = await Promise.all([
        getFreshLeads(workspace.id),
        getAgentPipeline(workspace.id)
    ])

    return <AgentDashboard freshLeads={freshLeads} initialPipeline={pipeline} />
}
