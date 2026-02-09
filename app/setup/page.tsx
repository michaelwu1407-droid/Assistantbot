import { redirect } from "next/navigation"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { SetupChat } from "@/components/onboarding/setup-chat"
import { createClient } from "@/lib/supabase/server"

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
    let userId = "demo-user"

    // Check for real authenticated user
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            userId = user.id
        }
    } catch (e) {
        // Supabase client creation failed, fall back to demo-user
    }

    // Check if the user has already completed onboarding
    let alreadyOnboarded = false
    try {
        const workspace = await getOrCreateWorkspace(userId)
        alreadyOnboarded = workspace.onboardingComplete
    } catch {
        // DB not ready — show setup anyway, it will save when DB is available
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
