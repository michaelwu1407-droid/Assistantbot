"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock, MessageSquare, Calendar, Target, Zap } from "lucide-react"
import { toast } from "sonner"

interface KanbanAutomationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deal: {
    id: string
    title: string
    contactName: string
    currentStage: string
    lastActivity: Date
    value: number
  }
  onAction: (action: string, data: any) => void
}

export function KanbanAutomationModal({ open, onOpenChange, deal, onAction }: KanbanAutomationModalProps) {
  const [selectedAction, setSelectedAction] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [followUpDate, setFollowUpDate] = useState("")
  const [isExecuting, setIsExecuting] = useState(false)

  const daysSinceLastActivity = Math.floor((Date.now() - deal.lastActivity.getTime()) / (1000 * 60 * 60 * 24))
  const isStale = daysSinceLastActivity >= 7
  const isRotting = daysSinceLastActivity >= 14

  const automationActions = [
    {
      id: "follow-up",
      name: "Send Follow-up",
      description: "Send a personalized follow-up message",
      icon: MessageSquare,
      color: "text-blue-600"
    },
    {
      id: "schedule-call",
      name: "Schedule Call",
      description: "Schedule a follow-up call with the client",
      icon: Calendar,
      color: "text-green-600"
    },
    {
      id: "nudge",
      name: "Send Nudge",
      description: "Send a gentle nudge to re-engage",
      icon: Zap,
      color: "text-amber-600"
    },
    {
      id: "escalate",
      name: "Escalate",
      description: "Flag for manager review",
      icon: AlertTriangle,
      color: "text-red-600"
    },
    {
      id: "move-stage",
      name: "Move Stage",
      description: "Move to a different pipeline stage",
      icon: Target,
      color: "text-purple-600"
    }
  ]

  const handleActionSelect = (actionId: string) => {
    setSelectedAction(actionId)
    
    // Set default message based on action
    const action = automationActions.find(a => a.id === actionId)
    if (action) {
      switch (actionId) {
        case "follow-up":
          setCustomMessage(`Hi ${deal.contactName}, I wanted to follow up on ${deal.title}. Is this still something you're interested in? Let me know if you have any questions or if there's anything I can help with!`)
          break
        case "nudge":
          setCustomMessage(`Hi ${deal.contactName}, just checking in about ${deal.title}. The market is quite active right now and I want to make sure you don't miss any opportunities. Are you still interested?`)
          break
        case "escalate":
          setCustomMessage(`This deal has been stale for ${daysSinceLastActivity} days and requires manager attention. Value: $${deal.value.toLocaleString()}`)
          break
        default:
          setCustomMessage("")
      }
    }
  }

  const handleExecute = async () => {
    if (!selectedAction) {
      toast.error("Please select an action")
      return
    }

    setIsExecuting(true)
    
    try {
      // Simulate execution
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const actionData = {
        dealId: deal.id,
        action: selectedAction,
        message: customMessage,
        followUpDate,
        timestamp: new Date().toISOString()
      }

      onAction(selectedAction, actionData)
      toast.success(`${automationActions.find(a => a.id === selectedAction)?.name} executed successfully`)
      
      // Reset form
      setSelectedAction("")
      setCustomMessage("")
      setFollowUpDate("")
      onOpenChange(false)
    } catch (error) {
      toast.error("Failed to execute action")
    } finally {
      setIsExecuting(false)
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
            <Zap className="h-5 w-5 text-amber-600" />
            <DialogTitle>Kanban Automation</DialogTitle>
          </div>
          <DialogDescription>
            Automate follow-up actions for stale deals in your pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Deal Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-gray-900">{deal.title}</h4>
                <p className="text-sm text-gray-600">{deal.contactName}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>Value: ${deal.value.toLocaleString()}</span>
                  <span>•</span>
                  <span>Stage: {deal.currentStage}</span>
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

          {/* Automation Actions */}
          <div className="space-y-3">
            <Label>Available Actions</Label>
            <div className="grid grid-cols-1 gap-2">
              {automationActions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.id}
                    onClick={() => handleActionSelect(action.id)}
                    className={`p-3 border rounded-lg text-left transition-all hover:shadow-md ${
                      selectedAction === action.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${action.color}`} />
                      <div>
                        <p className="font-medium text-gray-900">{action.name}</p>
                        <p className="text-sm text-gray-600">{action.description}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action Configuration */}
          {selectedAction && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Enter your message..."
                  rows={3}
                />
                <p className="text-xs text-gray-500">
                  {customMessage.length} characters
                </p>
              </div>

              {(selectedAction === "follow-up" || selectedAction === "schedule-call") && (
                <div className="space-y-2">
                  <Label htmlFor="follow-up-date">Follow-up Date</Label>
                  <input
                    id="follow-up-date"
                    type="datetime-local"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}

              {selectedAction === "move-stage" && (
                <div className="space-y-2">
                  <Label htmlFor="target-stage">Target Stage</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="qualified">Qualified</SelectItem>
                      <SelectItem value="proposal">Proposal</SelectItem>
                      <SelectItem value="negotiation">Negotiation</SelectItem>
                      <SelectItem value="closed-won">Closed Won</SelectItem>
                      <SelectItem value="closed-lost">Closed Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Execute Button */}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleExecute} 
              disabled={!selectedAction || isExecuting}
            >
              {isExecuting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Executing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Execute Action
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
