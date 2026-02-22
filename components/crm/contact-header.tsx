"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Mail, Phone, MoreHorizontal, Edit, MessageSquare, Bot } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import type { ContactView } from "@/actions/contact-actions"
import { sendSMS } from "@/actions/messaging-actions"
import { toast } from "sonner"

interface ContactHeaderProps {
  contact: ContactView
}

export function ContactHeader({ contact }: ContactHeaderProps) {
  const [smsOpen, setSmsOpen] = useState(false)
  const [smsMessage, setSmsMessage] = useState("")
  const [sending, setSending] = useState(false)

  const handleSendSms = async () => {
    if (!smsMessage.trim() || !contact.id) return
    setSending(true)
    try {
      const result = await sendSMS(contact.id, smsMessage)
      if (result.success) {
        toast.success("SMS sent via Twilio")
        setSmsMessage("")
        setSmsOpen(false)
      } else {
        toast.error(result.error || "Failed to send SMS")
      }
    } catch {
      toast.error("Failed to send SMS")
    } finally {
      setSending(false)
    }
  }

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
        {/* Email - dropdown with native + agent options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all">
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="text-xs">Email {contact.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {contact.email && (
              <DropdownMenuItem asChild>
                <a href={`mailto:${contact.email}`}>
                  <Mail className="mr-2 h-4 w-4" />
                  Open in email app
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => {
              window.location.href = `/dashboard/inbox?contact=${contact.id}`
            }}>
              <Bot className="mr-2 h-4 w-4" />
              Send via Agent (Resend)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Call/Text - dropdown with native + agent options */}
        <DropdownMenu open={smsOpen} onOpenChange={setSmsOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all">
              <Phone className="mr-2 h-4 w-4" />
              Call / Text
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="text-xs">Contact {contact.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {contact.phone && (
              <>
                <DropdownMenuItem asChild>
                  <a href={`tel:${contact.phone}`}>
                    <Phone className="mr-2 h-4 w-4" />
                    Call from my phone
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`sms:${contact.phone}`}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Text from my phone
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <div className="px-2 py-2">
              <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <Bot className="h-3 w-3" /> Send SMS via Twilio
              </p>
              <textarea
                className="w-full text-sm border border-input rounded-md px-2 py-1.5 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                rows={2}
                placeholder="Type your message..."
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <Button
                size="sm"
                className="w-full mt-1.5 h-7 text-xs"
                disabled={!smsMessage.trim() || sending}
                onClick={handleSendSms}
              >
                {sending ? "Sending..." : "Send via Twilio"}
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

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
