import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import { getContacts } from "@/actions/contact-actions"
import { ContactsClient } from "@/components/crm/contacts-client"

export const dynamic = 'force-dynamic'

export default async function ContactsPage() {
    const userId = await getAuthUserId()
    const workspace = await getOrCreateWorkspace(userId)
    const contacts = await getContacts(workspace.id)

    return <ContactsClient contacts={contacts} />
}
