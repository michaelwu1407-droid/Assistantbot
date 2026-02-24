import { redirect } from "next/navigation"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { SetupChat } from "@/components/onboarding/setup-chat"
import { getAuthUserId } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
    const userId = await getAuthUserId()

    let alreadyOnboarded = false
    try {
        const workspace = await getOrCreateWorkspace(userId)
        alreadyOnboarded = workspace.onboardingComplete
    } catch (error) {
        console.error("Workspace error:", error)
    }

    if (alreadyOnboarded) {
        redirect("/dashboard")
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative">
            <div className="absolute inset-0 ott-glow -z-10" />

            <div className="text-center mb-8 flex flex-col items-center gap-3">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-md shadow-primary/20 overflow-hidden">
                    <img src="/Latest logo.png" alt="Earlymark" className="h-12 w-12 object-contain" />
                </div>
                <h1 className="text-3xl font-extrabold text-midnight tracking-tight">Welcome to Earlymark</h1>
                <p className="text-muted-foreground">Let&apos;s personalise your assistant.</p>
            </div>

            <SetupChat />

            <div className="mt-8 text-xs text-muted-foreground opacity-60">
                Press Enter to send &bull; All data is secure
            </div>
        </div>
    )
}
