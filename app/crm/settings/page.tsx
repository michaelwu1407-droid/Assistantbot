import { ProfileForm } from "@/components/dashboard/profile-form"
import { ReferralSettings } from "@/components/settings/referral-settings"
import { CallForwardingCard } from "@/components/settings/call-forwarding-card"
import { AccountSecurityCard } from "@/components/settings/account-security-card"
import { getUserProfile } from "@/actions/user-actions"
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function AccountSettingsPage() {
  let actor: Awaited<ReturnType<typeof requireCurrentWorkspaceAccess>>
  try {
    actor = await requireCurrentWorkspaceAccess()
  } catch {
    redirect("/auth")
  }

  const profile = await getUserProfile(actor.id)
  const workspace = await db.workspace.findUnique({
    where: { id: actor.workspaceId },
    select: { name: true },
  })
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
        userId={actor.id}
        initialData={profile ? {
          username: profile.username,
          email: profile.email,
          viewMode: profile.viewMode
        } : undefined}
      />
      <CallForwardingCard />
      <AccountSecurityCard userId={actor.id} businessName={businessName} />
      <ReferralSettings userId={actor.id} />
    </div>
  )
}

