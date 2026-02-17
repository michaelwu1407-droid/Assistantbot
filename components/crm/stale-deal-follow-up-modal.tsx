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
}

export function StaleDealFollowUpModal({ open, onOpenChange, deal }: StaleDealFollowUpModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [selectedChannel, setSelectedChannel] = useState("email")
  const [isSending, setIsSending] = useState(false)

  const daysSinceLastActivity = Math.floor((Date.now() - deal.lastActivity.getTime()) / (1000 * 60 * 60 * 24))
  const isStale = daysSinceLastActivity >= 7
  const isRotting = daysSinceLastActivity >= 14

  const templates = [
    {
      id: "gentle-nudge",
      name: "Gentle Nudge",
      message: `Hi ${deal.contactName}, just following up on ${deal.title}. I wanted to check if you're still interested in moving forward. Let me know if you have any questions or if there's anything I can help with!`
    },
    {
      id: "value-focused",
      name: "Value Focused",
      message: `Hi ${deal.contactName}, I noticed we haven't connected about ${deal.title} recently. Given the current market conditions, properties like this are in high demand. Would you like to schedule a call to discuss next steps?`
    },
    {
      id: "urgent-follow-up",
      name: "Urgent Follow-up",
      message: `Hi ${deal.contactName}, following up on ${deal.title} as it's been a while since we last spoke. The market is quite active right now and I want to make sure you don't miss out on opportunities. Are you still interested?`
    },
    {
      id: "new-info",
      name: "New Information",
      message: `Hi ${deal.contactName}, I have some updated market information about properties similar to ${deal.title} that might interest you. Would you be available for a quick call this week to discuss?`
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
    if (!customMessage.trim()) {
      toast.error("Please enter a message")
      return
    }

    setIsSending(true)
    
    try {
      // Simulate sending the follow-up
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success(`Follow-up sent via ${selectedChannel}`)
      onOpenChange(false)
      
      // Reset form
      setSelectedTemplate("")
      setCustomMessage("")
      setSelectedChannel("email")
    } catch (error) {
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
            This deal hasn't had activity for {daysSinceLastActivity} days. Send a follow-up to re-engage the contact.
          </DialogDescription>
        </DialogHeader>

        {/* Deal Summary */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{deal.title}</h4>
                <p className="text-sm text-gray-600">{deal.contactName}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>Value: ${deal.value.toLocaleString()}</span>
                  <span>•</span>
                  <span>Stage: {deal.stage}</span>
                </div>
              </div>
              <Badge className={getStalenessColor()}>
                <Clock className="h-3 w-3 mr-1" />
                {getStalenessText()}
              </Badge>
            </div>
            <div className="text-sm text-gray-600">
              Last activity: {deal.lastActivity.toLocaleDateString()} ({daysSinceLastActivity} days ago)
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Information</Label>
              <div className="text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {deal.contactEmail || "No email"}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {deal.contactPhone || "No phone"}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel">Follow-up Channel</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="phone">Phone Call</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Message Templates */}
          <div className="space-y-2">
            <Label htmlFor="template">Message Template</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a template or write custom message" />
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

          {/* Custom Message */}
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
            </p>
          </div>

          {/* Action Buttons */}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSend} 
              disabled={!customMessage.trim() || isSending}
            >
              {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending...
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
