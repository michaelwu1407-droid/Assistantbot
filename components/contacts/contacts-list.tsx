"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Phone, Mail, Building2 } from "lucide-react"
import Link from "next/link"

interface Contact {
    id: string
    name: string
    email?: string | null
    phone?: string | null
    company?: string | null
}

interface ContactsListProps {
    contacts: Contact[]
    workspaceId: string
}

export function ContactsList({ contacts, workspaceId }: ContactsListProps) {
    const [search, setSearch] = useState("")
    
    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(search.toLowerCase()) ||
        contact.company?.toLowerCase().includes(search.toLowerCase()) ||
        contact.email?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search contacts..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button asChild>
                    <Link href="/dashboard/contacts/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Contact
                    </Link>
                </Button>
            </div>

            <div className="grid gap-3">
                {filteredContacts.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        No contacts found. Add your first contact to get started.
                    </div>
                ) : (
                    filteredContacts.map((contact) => (
                        <Link key={contact.id} href={`/dashboard/contacts/${contact.id}`}>
                            <Card className="hover:border-slate-400 transition-colors cursor-pointer">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-semibold text-slate-900">{contact.name}</h3>
                                        {contact.company && (
                                            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                                <Building2 className="h-3 w-3" />
                                                {contact.company}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400">
                                        {contact.email && <Mail className="h-4 w-4" />}
                                        {contact.phone && <Phone className="h-4 w-4" />}
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}
