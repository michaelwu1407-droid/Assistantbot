import { redirect } from "next/navigation"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { SetupChat } from "@/components/onboarding/setup-chat"
import { getAuthUserId } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
    const userId = await getAuthUserId()

    // Check if user has already completed onboarding
    let alreadyOnboarded = false
    try {
        const workspace = await getOrCreateWorkspace(userId)
        alreadyOnboarded = workspace.onboardingComplete
    } catch (error) {
        console.error("Workspace error:", error)
        // For now, just continue to setup even if DB fails
        // This will be fixed once database is properly synced
    }

    if (alreadyOnboarded) {
        // Returning user — skip setup, go straight to dashboard (no tutorial)
        redirect("/dashboard")
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="text-center mb-8 space-y-2">
                <h1 className="text-3xl font-bold text-slate-900">Welcome to Pj Buddy</h1>
                <p className="text-slate-600">Let&apos;s personalize your assistant.</p>
            </div>

            <SetupChat />

            <div className="mt-8 text-xs text-slate-400">
                Press Enter to send &bull; All data is secure
            </div>
        </div>
    )
}
