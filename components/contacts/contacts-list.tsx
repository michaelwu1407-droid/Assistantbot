"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search, Phone, Mail, Building2, MapPin, User } from "lucide-react"
import { useRouter } from "next/navigation"

interface Contact {
    id: string
    name: string
    email?: string | null
    phone?: string | null
    company?: string | null
    address?: string | null
    city?: string | null
    state?: string | null
    postcode?: string | null
}

interface ContactsListProps {
    contacts: Contact[]
    workspaceId: string
}

export function ContactsList({ contacts, workspaceId }: ContactsListProps) {
    const [search, setSearch] = useState("")
    const router = useRouter()
    
    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(search.toLowerCase()) ||
        contact.company?.toLowerCase().includes(search.toLowerCase()) ||
        contact.email?.toLowerCase().includes(search.toLowerCase()) ||
        contact.address?.toLowerCase().includes(search.toLowerCase())
    )

    const handleContactClick = (contactId: string) => {
        router.push(`/dashboard/contacts/${contactId}`)
    }

    const formatAddress = (contact: Contact) => {
        const parts = []
        if (contact.address) parts.push(contact.address)
        if (contact.city) parts.push(contact.city)
        if (contact.state) parts.push(contact.state)
        if (contact.postcode) parts.push(contact.postcode)
        return parts.join(", ")
    }

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
                    <a href="/dashboard/contacts/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Contact
                    </a>
                </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {filteredContacts.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 col-span-full">
                        No contacts found. Add your first contact to get started.
                    </div>
                ) : (
                    filteredContacts.map((contact) => (
                        <Card 
                            key={contact.id} 
                            className="hover:border-slate-400 transition-colors cursor-pointer hover:shadow-md"
                            onClick={() => handleContactClick(contact.id)}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                        <User className="h-5 w-5 text-slate-500" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-slate-900 truncate">{contact.name}</h3>
                                        {contact.company && (
                                            <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                                                <Building2 className="h-3 w-3 flex-shrink-0" />
                                                <span className="truncate">{contact.company}</span>
                                            </p>
                                        )}
                                        
                                        <div className="mt-2 space-y-1">
                                            {contact.phone && (
                                                <p className="text-sm text-slate-600 flex items-center gap-1.5">
                                                    <Phone className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                                    {contact.phone}
                                                </p>
                                            )}
                                            {contact.email && (
                                                <p className="text-sm text-slate-600 flex items-center gap-1.5">
                                                    <Mail className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                                    <span className="truncate">{contact.email}</span>
                                                </p>
                                            )}
                                            {formatAddress(contact) && (
                                                <p className="text-sm text-slate-600 flex items-center gap-1.5">
                                                    <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                                                    <span className="truncate">{formatAddress(contact)}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
