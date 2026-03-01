import { redirect } from "next/navigation"
import { getAuthUser } from "@/lib/auth"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { NewDealModalStandalone } from "@/components/modals/new-deal-modal-standalone"

export default async function NewDealPage() {
    const authUser = await getAuthUser()
    if (!authUser) redirect("/login")

    try {
        const workspace = await getOrCreateWorkspace(authUser.id)
        return (
            <div className="h-full flex items-center justify-center p-4">
                <NewDealModalStandalone workspaceId={workspace.id} />
            </div>
        )
    } catch {
        return (
            <div className="h-full flex items-center justify-center p-8">
                <div className="max-w-sm w-full rounded-xl border border-amber-200 bg-amber-50 p-5 text-center space-y-2 shadow-lg">
                    <h3 className="text-sm font-semibold text-amber-800">Database connection unavailable</h3>
                    <p className="text-xs text-amber-600">We couldn't open the booking form. Please check your internet and try again.</p>
                </div>
            </div>
        )
    }
}
