import { Separator } from "@/components/ui/separator"
import { ProfileForm } from "../profile-form"
import { getAuthUser } from "@/lib/auth"

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
    const user = await getAuthUser();

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
                initialData={{
                    username: user.name?.split(' ')[0] || "user", // Use first name as username
                    email: user.email,
                    bio: "", // Bio not available in user model yet
                }}
            />
        </div>
    )
}
