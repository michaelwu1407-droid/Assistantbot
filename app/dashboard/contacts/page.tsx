import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import { getContacts } from "@/actions/contact-actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export const dynamic = 'force-dynamic'

export default async function ContactsPage() {
    const userId = await getAuthUserId()
    const workspace = await getOrCreateWorkspace(userId)
    const contacts = await getContacts(workspace.id)

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {contacts.map(contact => (
                    <Card key={contact.id}>
                        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                            <Avatar>
                                <AvatarImage src={contact.avatarUrl || undefined} />
                                <AvatarFallback>{contact.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <CardTitle className="text-base font-medium leading-none">
                                    {contact.name}
                                </CardTitle>
                                <span className="text-sm text-muted-foreground">{contact.company || "Individual"}</span>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground space-y-1 mt-2">
                                {contact.email && <div className="flex items-center gap-2">{contact.email}</div>}
                                {contact.phone && <div className="flex items-center gap-2">{contact.phone}</div>}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
