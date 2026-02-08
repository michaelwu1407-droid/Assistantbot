import { redirect } from "next/navigation"
import { getDeals } from "@/actions/deal-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { DashboardClient } from "@/components/dashboard/dashboard-client"

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
    let workspace, deals;
    let dbError = false;
    try {
        workspace = await getOrCreateWorkspace("demo-user")
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
            <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-md space-y-4">
                    <h2 className="text-2xl font-bold text-slate-900">Database Not Initialized</h2>
                    <p className="text-slate-500">
                        The database tables have not been created yet. Run these commands with your Supabase DIRECT_URL:
                    </p>
                    <pre className="bg-slate-100 text-slate-800 p-4 rounded-lg text-left text-sm overflow-x-auto">
{`DATABASE_URL="your-direct-url" \\
  npx prisma@6 db push

DATABASE_URL="your-direct-url" \\
  npx prisma@6 db seed`}
                    </pre>
                    <p className="text-xs text-slate-400">
                        Use the DIRECT_URL (port 5432), not the pooler URL.
                    </p>
                </div>
            </div>
        )
    }

    return <DashboardClient workspace={workspace} deals={deals} />
}
