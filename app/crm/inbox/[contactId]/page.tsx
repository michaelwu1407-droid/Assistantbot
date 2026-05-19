import { redirect } from "next/navigation"
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access"
import { getActivities } from "@/actions/activity-actions"
import { getContact } from "@/actions/contact-actions"
import { InboxThreadMobile } from "@/components/mobile/inbox/inbox-thread-mobile"

export const dynamic = "force-dynamic"

export default async function InboxThreadPage({
  params,
}: {
  params: Promise<{ contactId: string }>
}) {
  let actor: Awaited<ReturnType<typeof requireCurrentWorkspaceAccess>>
  try {
    actor = await requireCurrentWorkspaceAccess()
  } catch {
    redirect("/login")
  }

  if (actor.role === "TEAM_MEMBER") redirect("/crm/dashboard")

  const { contactId } = await params

  const [contact, activities] = await Promise.all([
    getContact(contactId),
    getActivities({ workspaceId: actor.workspaceId, contactId, limit: 100 }),
  ])

  if (!contact) redirect("/crm/inbox")

  return (
    <InboxThreadMobile
      contactId={contactId}
      contactName={contact.name}
      contactPhone={contact.phone}
      activities={activities}
      workspaceId={actor.workspaceId}
    />
  )
}
