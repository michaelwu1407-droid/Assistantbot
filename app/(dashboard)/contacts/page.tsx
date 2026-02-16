import { getAuthUserId } from "@/lib/auth"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getContacts } from "@/actions/contact-actions"
import { ContactsList } from "@/components/contacts/contacts-list"

export const dynamic = "force-dynamic"

export default async function ContactsPage() {
    const userId = await getAuthUserId()
    
    if (!userId) {
        throw new Error("User not authenticated")
    }
    
    const workspace = await getOrCreateWorkspace(userId)
    const contacts = await getContacts(workspace.id)

    return (
        <div className="h-full p-6 overflow-auto">
            <h1 className="text-2xl font-bold mb-6">Contacts</h1>
            <ContactsList contacts={contacts} workspaceId={workspace.id} />
        </div>
    )
}
