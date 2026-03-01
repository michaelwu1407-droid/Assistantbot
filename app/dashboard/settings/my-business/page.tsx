import { Separator } from "@/components/ui/separator"
import { getAuthUserId } from "@/lib/auth"
import { getOrCreateWorkspace, getWorkspaceWithSettings } from "@/actions/workspace-actions"
import { getBusinessContact } from "@/actions/settings-actions"
import { MyBusinessDetails } from "@/components/settings/my-business-details"
import { WorkingHoursForm } from "@/components/settings/working-hours-form"
import { BusinessContactForm } from "@/components/settings/business-contact-form"
import { ServiceAreasSection } from "@/components/settings/service-areas-section"
import { PricingForAgentSection } from "@/components/settings/pricing-for-agent-section"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function MyBusinessSettingsPage() {
  const userId = (await getAuthUserId()) as string;
  const workspace = await getOrCreateWorkspace(userId)
  const workspaceWithSettings = await getWorkspaceWithSettings(workspace.id)
  const businessContact = await getBusinessContact()
  const profile = await db.businessProfile.findUnique({
    where: { userId },
    select: { tradeType: true },
  })

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">My business</h3>
        <p className="text-sm text-slate-500">
          Business details, hours, contact info, and pricing so your AI agent can represent you accurately.
        </p>
      </div>
      <Separator />

      <section>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Business details</h4>
        <MyBusinessDetails
          workspaceId={workspace.id}
          initialData={{
            name: workspace.name,
            specialty: profile?.tradeType ?? "Plumber",
            location: workspace.location ?? "",
          }}
        />
      </section>
      <Separator />

      <section>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Working hours</h4>
        <WorkingHoursForm
          initialData={{
            workingHoursStart: (workspaceWithSettings as { workingHoursStart?: string })?.workingHoursStart ?? "08:00",
            workingHoursEnd: (workspaceWithSettings as { workingHoursEnd?: string })?.workingHoursEnd ?? "17:00",
            emergencyHoursStart: (workspaceWithSettings as { emergencyHoursStart?: string })?.emergencyHoursStart ?? "",
            emergencyHoursEnd: (workspaceWithSettings as { emergencyHoursEnd?: string })?.emergencyHoursEnd ?? "",
            agendaNotifyTime: (workspaceWithSettings as { agendaNotifyTime?: string })?.agendaNotifyTime ?? "07:30",
            wrapupNotifyTime: (workspaceWithSettings as { wrapupNotifyTime?: string })?.wrapupNotifyTime ?? "17:30",
          }}
        />
      </section>
      <Separator />

      <section>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Public-facing contact</h4>
        <BusinessContactForm initialData={businessContact ?? undefined} />
      </section>
      <Separator />

      <section>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Service areas</h4>
        <ServiceAreasSection />
      </section>
      <Separator />

      <section>
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Pricing information for agent</h4>
        <PricingForAgentSection
          initialCallOutFee={(workspaceWithSettings as { callOutFee?: number })?.callOutFee ?? 0}
        />
      </section>
    </div>
  )
}

