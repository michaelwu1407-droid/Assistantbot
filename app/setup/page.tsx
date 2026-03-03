import { redirect } from "next/navigation"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { TraceyOnboarding } from "@/components/onboarding/tracey-onboarding"
import { getAuthUserId } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
    const userId = await getAuthUserId()

    if (!userId) {
        redirect("/auth")
    }

    let alreadyOnboarded = false
    try {
        const workspace = await getOrCreateWorkspace(userId ?? undefined)
        alreadyOnboarded = workspace.onboardingComplete
    } catch (error) {
        console.error("Workspace error:", error)
    }

    if (alreadyOnboarded) {
        redirect("/dashboard")
    }

    return <TraceyOnboarding />
}
