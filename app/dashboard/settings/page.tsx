import { Separator } from "@/components/ui/separator"
import { ProfileForm } from "./profile-form"
// import { Button } from "@/components/ui/button" // Replay tutorial button needs client component or different approach
// We'll move the replay button to a client component or just the AppearanceForm?
// Actually, let's just make a small client wrapper for the header button if needed, or drop it for now? 
// The user asked to fix broken pages. Replay tutorial is a nice to have.
// Let's keep it but use a client component for the header?
import { SettingsHeader } from "./settings-header"
import { getAuthUserId } from "@/lib/auth"
import { getUserProfile } from "@/actions/user-actions"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
    const userId = await getAuthUserId()
    const profile = await getUserProfile(userId)

    return (
        <div className="space-y-6">
            <SettingsHeader />
            <Separator />
            <ProfileForm
                userId={userId}
                initialData={profile ? {
                    username: profile.username,
                    email: profile.email,
                    bio: profile.bio,
                    urls: profile.urls
                } : undefined}
            />
        </div>
    )
}
