import { ProfileForm } from "@/components/dashboard/profile-form"
import { ReferralSettings } from "@/components/settings/referral-settings"
import { CallForwardingCard } from "@/components/settings/call-forwarding-card"
import { AccountSecurityCard } from "@/components/settings/account-security-card"
import { getAuthUserId } from "@/lib/auth"
import { getUserProfile } from "@/actions/user-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"

export const dynamic = "force-dynamic"

export default async function AccountSettingsPage() {
  const userId = (await getAuthUserId()) as string;
  const profile = await getUserProfile(userId)
  const workspace = await getOrCreateWorkspace(userId)
  const businessName = workspace?.name ?? ""

  return (
    <div className="space-y-6">
      <div>
        <h3 className="app-section-title">Account</h3>
        <p className="app-body-secondary">
          Profile, phone, security, and referrals.
        </p>
      </div>
      <ProfileForm
        userId={userId}
        initialData={profile ? {
          username: profile.username,
          email: profile.email,
          viewMode: profile.viewMode
        } : undefined}
      />
      <CallForwardingCard />
      <AccountSecurityCard userId={userId} businessName={businessName} />
      <ReferralSettings userId={userId} />
    </div>
  )
}

