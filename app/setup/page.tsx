import { redirect } from "next/navigation"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { SetupChat } from "@/components/onboarding/setup-chat"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
    // Check if the user has already completed onboarding
    let alreadyOnboarded = false
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        // Use real user ID or fallback to demo-user if not authenticated (though middleware prevents this)
        const userId = user?.id || "demo-user"

        const workspace = await getOrCreateWorkspace(userId)
        alreadyOnboarded = workspace.onboardingComplete
    } catch {
        // DB not ready — show setup anyway, it will save when DB is available
    }

    if (alreadyOnboarded) {
        // Always show tutorial on sign-in (for troubleshooting)
        redirect("/dashboard?tutorial=true")
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
