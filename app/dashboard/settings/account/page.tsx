import { Separator } from "@/components/ui/separator"
import { AccountForm } from "@/components/dashboard/account-form"
import { getAuthUserId } from "@/lib/auth"
import { getUserProfile } from "@/actions/user-actions"

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
    const userId = (await getAuthUserId()) as string;
    const profile = await getUserProfile(userId)

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Account</h3>
                <p className="text-sm text-muted-foreground">
                    Manage your account security and preferences.
                </p>
            </div>
            <Separator />
            <AccountForm 
                userId={userId}
                email={profile?.email}
            />
        </div>
    )
}

