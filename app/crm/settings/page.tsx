import { Separator } from "@/components/ui/separator"
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
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Account</h3>
        <p className="text-sm text-slate-500">
          Keep your profile, phone setup, security, and referrals up to date.
        </p>
      </div>
      <Separator />

      {/* 1. User profile: name, email */}
      <section>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">User profile</h4>
        <ProfileForm
          userId={userId}
          initialData={profile ? { 
            username: profile.username, 
            email: profile.email,
            viewMode: profile.viewMode
          } : undefined}
        />
      </section>
      <Separator />

      {/* 2. Personal phone + call forwarding */}
      <section>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Personal phone and call forwarding</h4>
        <CallForwardingCard />
      </section>
      <Separator />

      {/* 3. Security */}
      <section>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Security</h4>
        <AccountSecurityCard userId={userId} businessName={businessName} />
      </section>
      <Separator />

      {/* 4. Referral settings */}
      <section>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Referral settings</h4>
        <ReferralSettings userId={userId} />
      </section>
    </div>
  )
}

