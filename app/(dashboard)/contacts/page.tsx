import { getAuthUserId } from "@/lib/auth"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getContacts } from "@/actions/contact-actions"
import { ContactsList } from "@/components/contacts/contacts-list"

export const dynamic = "force-dynamic"

export default async function ContactsPage() {
    try {
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
    } catch (error) {
        console.error("Contacts page error:", error)
        return (
            <div className="h-full p-6 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Contacts</h2>
                    <p className="text-slate-600">{(error as Error).message}</p>
                </div>
            </div>
        )
    }
}
