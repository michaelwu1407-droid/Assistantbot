import { Separator } from "@/components/ui/separator"
import { ProfileForm } from "@/components/dashboard/profile-form"
import { getAuthUserId } from "@/lib/auth"
import { getUserProfile } from "@/actions/user-actions"

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
    const userId = await getAuthUserId()
    const profile = await getUserProfile(userId)

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Account</h3>
                <p className="text-sm text-muted-foreground">
                    Update your account settings. Set your preferred language and timezone.
                </p>
            </div>
            <Separator />
            <ProfileForm 
                userId={userId}
                initialData={profile ? {
                    username: profile.username,
                    email: profile.email,
                    bio: profile.bio || undefined,
                    urls: profile.urls
                } : undefined}
            />
        </div>
    )
}
