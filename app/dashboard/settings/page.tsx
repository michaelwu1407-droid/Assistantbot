import { Separator } from "@/components/ui/separator"
import { ProfileForm } from "@/components/dashboard/profile-form"
import { ReferralSettings } from "@/components/settings/referral-settings"
import { SettingsHeader } from "@/components/dashboard/settings-header"
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
            <ReferralSettings userId={userId} />
            <Separator />
            <ProfileForm
                userId={userId}
                initialData={profile ? {
                    username: profile.username,
                    email: profile.email,
                } : undefined}
            />
        </div>
    )
}
