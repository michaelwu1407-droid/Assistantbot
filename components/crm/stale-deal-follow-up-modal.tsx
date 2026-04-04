"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock, MessageSquare, Phone, Mail } from "lucide-react"
import { toast } from "sonner"
import { sendFollowUpMessage, scheduleFollowUp } from "@/actions/followup-actions"
import { getUserFacingDealStageLabel } from "@/lib/deal-utils"

interface StaleDealFollowUpModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deal: {
    id: string
    title: string
    contactName: string
    contactEmail?: string
    contactPhone?: string
    lastActivity: Date
    value: number
    stage: string
  }
  onFollowUpSent?: () => void
}

export function StaleDealFollowUpModal({ open, onOpenChange, deal, onFollowUpSent }: StaleDealFollowUpModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [selectedChannel, setSelectedChannel] = useState("sms")
  const [isSending, setIsSending] = useState(false)
  const [scheduleDate, setScheduleDate] = useState("")

  const daysSinceLastActivity = Math.floor((Date.now() - deal.lastActivity.getTime()) / (1000 * 60 * 60 * 24))
  const isStale = daysSinceLastActivity >= 7
  const isRotting = daysSinceLastActivity >= 14

  const templates = [
    {
      id: "gentle-nudge",
      name: "Gentle Nudge",
      message: `Hi ${deal.contactName}, just following up on ${deal.title}. I wanted to check if you're still interested in moving forward. Let me know if you have any questions!`
    },
    {
      id: "value-focused",
      name: "Value Focused",
      message: `Hi ${deal.contactName}, I noticed we haven't connected about ${deal.title} recently. I'd love to help you move forward when the timing is right. Happy to answer any questions.`
    },
    {
      id: "urgent-follow-up",
      name: "Urgent Follow-up",
      message: `Hi ${deal.contactName}, following up on ${deal.title} — it's been a while since we spoke. Are you still interested? Happy to jump on a quick call.`
    },
    {
      id: "new-info",
      name: "New Information",
      message: `Hi ${deal.contactName}, I have some updates regarding ${deal.title} that might interest you. Would you be available for a quick call this week?`
    }
  ]

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setSelectedTemplate(templateId)
      setCustomMessage(template.message)
    }
  }

  const handleSend = async () => {
    if (selectedChannel === "phone") {
      // Log as a scheduled call — no message to send
      if (scheduleDate) {
        const result = await scheduleFollowUp(deal.id, new Date(scheduleDate), customMessage || "Phone call follow-up", "phone")
        if (result.success) {
          toast.success("Phone follow-up scheduled — you'll be reminded on the day")
          onOpenChange(false)
          onFollowUpSent?.()
        } else {
          toast.error(result.error || "Failed to schedule follow-up")
        }
      } else {
        toast.info("Add a date to schedule your call reminder, or use SMS/Email to send now.")
      }
      return
    }

    if (!customMessage.trim()) {
      toast.error("Please enter a message")
      return
    }

    const channel = selectedChannel as "sms" | "email"

    if (channel === "sms" && !deal.contactPhone) {
      toast.error(`${deal.contactName} has no phone number on file. Use Email or add a phone number first.`)
      return
    }
    if (channel === "email" && !deal.contactEmail) {
      toast.error(`${deal.contactName} has no email on file. Use SMS or add an email first.`)
      return
    }

    setIsSending(true)
    try {
      const result = await sendFollowUpMessage(deal.id, customMessage, channel)
      if (result.success) {
        toast.success(`Follow-up sent via ${channel === "sms" ? "SMS" : "email"}`)
        onOpenChange(false)
        onFollowUpSent?.()
        setSelectedTemplate("")
        setCustomMessage("")
        setSelectedChannel("sms")
      } else {
        toast.error(result.error || "Failed to send follow-up")
      }
    } catch {
      toast.error("Failed to send follow-up")
    } finally {
      setIsSending(false)
    }
  }

  const getStalenessColor = () => {
    if (isRotting) return "bg-red-100 text-red-800 border-red-200"
    if (isStale) return "bg-amber-100 text-amber-800 border-amber-200"
    return "bg-blue-100 text-blue-800 border-blue-200"
  }

  const getStalenessText = () => {
    if (isRotting) return "Rotting Deal"
    if (isStale) return "Stale Deal"
    return "Recent Activity"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <DialogTitle>Stale Deal Follow-up</DialogTitle>
          </div>
          <DialogDescription>
            This deal hasn&apos;t had activity for {daysSinceLastActivity} days. Send a follow-up to re-engage the contact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Deal Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{deal.title}</h4>
                <p className="text-sm text-gray-600">{deal.contactName}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>Value: ${deal.value.toLocaleString()}</span>
                  <span>•</span>
                  <span>Stage: {getUserFacingDealStageLabel(deal.stage)}</span>
                </div>
              </div>
              <Badge className={getStalenessColor()}>
                <Clock className="h-3 w-3 mr-1" />
                {getStalenessText()}
              </Badge>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              Last activity: {deal.lastActivity.toLocaleDateString()} ({daysSinceLastActivity} days ago)
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact</Label>
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {deal.contactEmail || <span className="text-gray-400 italic">No email</span>}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {deal.contactPhone || <span className="text-gray-400 italic">No phone</span>}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms" disabled={!deal.contactPhone}>
                    SMS {!deal.contactPhone && "(no phone)"}
                  </SelectItem>
                  <SelectItem value="email" disabled={!deal.contactEmail}>
                    Email {!deal.contactEmail && "(no email)"}
                  </SelectItem>
                  <SelectItem value="phone">Phone Call (schedule reminder)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Phone call: show date picker for reminder */}
          {selectedChannel === "phone" && (
            <div className="space-y-2">
              <Label htmlFor="call-date">When to call? (sets a reminder for you)</Label>
              <input
                id="call-date"
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="space-y-2">
                <Label htmlFor="call-notes">Call notes (optional)</Label>
                <Textarea
                  id="call-notes"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="What to discuss on the call..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Message Templates — shown for SMS/email */}
          {selectedChannel !== "phone" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="template">Template</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a template or write your own" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Type your follow-up message here..."
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  {customMessage.length} characters
                  {selectedChannel === "sms" && customMessage.length > 160 && (
                    <span className="text-amber-600 ml-2">⚠ May be split into multiple SMS</span>
                  )}
                </p>
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={
                isSending ||
                (selectedChannel !== "phone" && !customMessage.trim()) ||
                (selectedChannel === "phone" && !scheduleDate)
              }
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending...
                </>
              ) : selectedChannel === "phone" ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule Call Reminder
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Follow-up
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
