import { redirect } from "next/navigation"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import { getContactsPage } from "@/actions/contact-actions"
import { ContactsClient } from "@/components/crm/contacts-client"
import { isManagerOrAbove } from "@/lib/rbac"

export const dynamic = 'force-dynamic'

export default async function ContactsPage(props: {
    searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
    const searchParams = props.searchParams ? await props.searchParams : {}
    const pageRaw = searchParams?.page
    const pageString = Array.isArray(pageRaw) ? pageRaw[0] : pageRaw
    const page = pageString ? Number(pageString) : 1
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1

    const userId = (await getAuthUserId()) as string;

    // RBAC: Team members cannot access contacts list
    if (!(await isManagerOrAbove())) {
        redirect("/crm/dashboard")
    }

    const workspace = await getOrCreateWorkspace(userId)
    const contactsPage = await getContactsPage(workspace.id, { page: safePage, pageSize: 100 })

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

