import { redirect } from "next/navigation"
import { getContactsPage } from "@/actions/contact-actions"
import { ContactsClient } from "@/components/crm/contacts-client"
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access"

export const dynamic = 'force-dynamic'

export default async function ContactsPage(props: {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
    const searchParams = props.searchParams ? await props.searchParams : {}
    const pageRaw = searchParams?.page
    const pageString = Array.isArray(pageRaw) ? pageRaw[0] : pageRaw
    const page = pageString ? Number(pageString) : 1
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1

    let actor: Awaited<ReturnType<typeof requireCurrentWorkspaceAccess>>
    try {
        actor = await requireCurrentWorkspaceAccess()
    } catch {
        redirect("/auth")
    }

    // RBAC: Team members cannot access contacts list.
    if (actor.role === "TEAM_MEMBER") {
        redirect("/crm/dashboard")
    }

    const contactsPage = await getContactsPage(actor.workspaceId, { page: safePage, pageSize: 100 })

    return (
        <ContactsClient
            contacts={contactsPage.contacts}
            pagination={{
                page: contactsPage.page,
                pageSize: contactsPage.pageSize,
                total: contactsPage.total,
                hasNextPage: contactsPage.hasNextPage,
                hasPrevPage: contactsPage.hasPrevPage,
            }}
        />
    )
}

