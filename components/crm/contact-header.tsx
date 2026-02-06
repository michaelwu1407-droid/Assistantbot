"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Mail, Phone, MoreHorizontal, Edit } from "lucide-react"
import type { ContactView } from "@/actions/contact-actions"

interface ContactHeaderProps {
  contact: ContactView
}

export function ContactHeader({ contact }: ContactHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-slate-200">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 border-2 border-white shadow-sm">
          <AvatarImage src={contact.avatarUrl || undefined} />
          <AvatarFallback className="bg-blue-100 text-blue-700 text-xl">
            {contact.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{contact.name}</h1>
          <p className="text-slate-500">{contact.company || "No Company"}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Mail className="mr-2 h-4 w-4" />
          Email
        </Button>
        <Button variant="outline" size="sm">
          <Phone className="mr-2 h-4 w-4" />
          Call
        </Button>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
