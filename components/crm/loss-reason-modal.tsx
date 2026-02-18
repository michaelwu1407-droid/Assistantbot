"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle, XCircle } from "lucide-react"
import { toast } from "sonner"

interface LossReasonModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deal: {
    id: string
    title: string
    contactName: string
  }
  onConfirm: (reason: string) => void
}

export function LossReasonModal({ open, onOpenChange, deal, onConfirm }: LossReasonModalProps) {
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for the loss")
      return
    }

    setIsSubmitting(true)
    try {
      await onConfirm(reason)
      setReason("")
      onOpenChange(false)
    } catch (error) {
      toast.error("Failed to update deal")
    } finally {
      setIsSubmitting(false)
    }
  }

  const commonReasons = [
    "Price too high",
    "Lost to competitor",
    "Client changed mind",
    "Timeline issues",
    "Budget constraints",
    "Went with different provider",
    "Project cancelled",
    "Other"
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <DialogTitle>Mark Deal as Lost</DialogTitle>
          </div>
          <DialogDescription>
            Please provide a reason why this deal was lost. This helps improve future conversions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Deal Summary */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="font-medium text-gray-900">{deal.title}</p>
            <p className="text-sm text-gray-600">{deal.contactName}</p>
          </div>

          {/* Common Reasons */}
          <div className="space-y-2">
            <Label>Common Reasons</Label>
            <div className="grid grid-cols-2 gap-2">
              {commonReasons.map((commonReason) => (
                <Button
                  key={commonReason}
                  variant="outline"
                  size="sm"
                  onClick={() => setReason(commonReason)}
                  className="text-xs h-8"
                >
                  {commonReason}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Detailed Reason (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide additional details about why this deal was lost..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!reason.trim() || isSubmitting}
            variant="destructive"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Marking as Lost...
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-2" />
                Mark as Lost
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
