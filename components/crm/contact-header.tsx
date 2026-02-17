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
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-border/40">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 border-2 border-background shadow-glass">
          <AvatarImage src={contact.avatarUrl || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
            {contact.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{contact.name}</h1>
          <p className="text-muted-foreground">{contact.company || "No Company"}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all">
          <Mail className="mr-2 h-4 w-4" />
          Email
        </Button>
        <Button variant="outline" size="sm" className="hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all">
          <Phone className="mr-2 h-4 w-4" />
          Call
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
