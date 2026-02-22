"use client"

import React, { useState } from "react"
import { X, Calendar, AlertTriangle, CheckCircle, Clock, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DealView } from "@/actions/deal-actions"
import { ACTUAL_OUTCOME_OPTIONS, ActualOutcome } from "@/lib/deal-utils"
import { reconcileStaleJob } from "@/actions/stale-job-actions"
import { format } from "date-fns"

interface StaleJobReconciliationModalProps {
  deal: DealView
  onClose: () => void
  onSuccess: () => void
}

export function StaleJobReconciliationModal({
  deal,
  onClose,
  onSuccess,
}: StaleJobReconciliationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actualOutcome, setActualOutcome] = useState<ActualOutcome | "">("")
  const [outcomeNotes, setOutcomeNotes] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!actualOutcome) {
      return
    }

    setIsSubmitting(true)
    
    try {
      await reconcileStaleJob({
        dealId: deal.id,
        actualOutcome,
        outcomeNotes: outcomeNotes.trim() || null,
      })
      
      onSuccess()
    } catch (error) {
      console.error("Failed to reconcile stale job:", error)
      // You could add error handling here (toast, etc.)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getOutcomeIcon = (outcome: ActualOutcome) => {
    switch (outcome) {
      case "COMPLETED":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "RESCHEDULED":
        return <Clock className="w-4 h-4 text-blue-600" />
      case "NO_SHOW":
        return <UserX className="w-4 h-4 text-orange-600" />
      case "CANCELLED":
        return <X className="w-4 h-4 text-red-600" />
      default:
        return null
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Reconcile Overdue Job
          </DialogTitle>
          <DialogDescription>
            This job was scheduled for{" "}
            {deal.scheduledAt && format(new Date(deal.scheduledAt), "MMM d, yyyy 'at' h:mm a")}
            {" "}but no outcome was recorded. Please update what happened.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Deal Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="font-medium text-sm text-amber-900 mb-1">
              {deal.title}
            </div>
            <div className="text-xs text-amber-700">
              Customer: {deal.contactName}
              {deal.address && ` • ${deal.address}`}
            </div>
          </div>

          {/* Actual Outcome */}
          <div className="space-y-2">
            <Label htmlFor="actualOutcome" className="text-sm font-medium">
              What happened with this job? <span className="text-red-500">*</span>
            </Label>
            <Select
              value={actualOutcome}
              onValueChange={(value) => setActualOutcome(value as ActualOutcome)}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an outcome" />
              </SelectTrigger>
              <SelectContent>
                {ACTUAL_OUTCOME_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {getOutcomeIcon(option.value)}
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Outcome Notes */}
          <div className="space-y-2">
            <Label htmlFor="outcomeNotes" className="text-sm font-medium">
              Notes (optional)
            </Label>
            <Textarea
              id="outcomeNotes"
              placeholder="Add any additional details about what happened..."
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!actualOutcome || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Saving..." : "Update Job"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
