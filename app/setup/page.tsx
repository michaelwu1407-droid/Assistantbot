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
        <div className="h-[calc(100dvh-57px)] bg-background flex flex-col items-center justify-start px-4 pt-2 pb-2 md:pt-3 md:pb-2 relative overflow-hidden">
            <div className="absolute inset-0 ott-glow -z-10" />

            <div className="text-center mb-2 md:mb-2 flex flex-col items-center gap-1.5">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-md shadow-primary/20 overflow-hidden">
                    <img src="/latest-logo.png" alt="Earlymark" className="h-12 w-12 object-contain" />
                </div>
                <h1 className="text-3xl font-extrabold text-midnight tracking-tight">Welcome to Earlymark</h1>
                <p className="text-muted-foreground">Let&apos;s personalise your assistant.</p>
            </div>

            <SetupChat />

            <div className="mt-2 text-xs text-muted-foreground opacity-60">
                Press Enter to send &bull; All data is secure
            </div>
        </div>
    )
}

