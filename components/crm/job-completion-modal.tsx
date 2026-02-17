"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Star, Clock, DollarSign, MessageSquare, Camera, FileText } from "lucide-react"
import { toast } from "sonner"

interface JobCompletionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deal: {
    id: string
    title: string
    contactName: string
    contactEmail?: string
    contactPhone?: string
    value: number
    address?: string
    description?: string
  }
  onComplete: (reviewData: JobCompletionReview) => void
}

interface JobCompletionReview {
  rating: number
  clientSatisfaction: number
  notes: string
  nextSteps: string
  requestPayment: boolean
  requestReview: boolean
  photos: string[]
  issues: string[]
}

export function JobCompletionModal({ open, onOpenChange, deal, onComplete }: JobCompletionModalProps) {
  const [reviewData, setReviewData] = useState<JobCompletionReview>({
    rating: 0,
    clientSatisfaction: 0,
    notes: "",
    nextSteps: "",
    requestPayment: true,
    requestReview: true,
    photos: [],
    issues: []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newIssue, setNewIssue] = useState("")

  const handleRatingChange = (rating: number) => {
    setReviewData(prev => ({ ...prev, rating }))
  }

  const handleSatisfactionChange = (satisfaction: number) => {
    setReviewData(prev => ({ ...prev, clientSatisfaction: satisfaction }))
  }

  const handleAddIssue = () => {
    if (newIssue.trim()) {
      setReviewData(prev => ({
        ...prev,
        issues: [...prev.issues, newIssue.trim()]
      }))
      setNewIssue("")
    }
  }

  const handleRemoveIssue = (index: number) => {
    setReviewData(prev => ({
      ...prev,
      issues: prev.issues.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      // Simulate submission
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      onComplete(reviewData)
      onOpenChange(false)
      
      toast.success("Job completion review submitted successfully")
      
      // Reset form
      setReviewData({
        rating: 0,
        clientSatisfaction: 0,
        notes: "",
        nextSteps: "",
        requestPayment: true,
        requestReview: true,
        photos: [],
        issues: []
      })
    } catch (error) {
      toast.error("Failed to submit review")
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStars = (rating: number, onChange: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star
              className={`h-6 w-6 ${
                star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <DialogTitle>Job Completion Review</DialogTitle>
          </div>
          <DialogDescription>
            Complete the job review and gather client feedback for {deal.title}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Job Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Job Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500">Client</Label>
                  <p className="font-medium">{deal.contactName}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500">Value</Label>
                  <p className="font-medium text-green-600">${deal.value.toLocaleString()}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm text-gray-500">Address</Label>
                  <p className="font-medium">{deal.address || "No address provided"}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm text-gray-500">Description</Label>
                  <p className="text-sm">{deal.description || "No description provided"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quality Rating */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Work Quality</CardTitle>
              <CardDescription>Rate the quality of work completed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Job Quality Rating</Label>
                {renderStars(reviewData.rating, handleRatingChange)}
                <p className="text-xs text-gray-500 mt-1">
                  {reviewData.rating === 0 && "Click to rate"}
                  {reviewData.rating === 1 && "Poor"}
                  {reviewData.rating === 2 && "Fair"}
                  {reviewData.rating === 3 && "Good"}
                  {reviewData.rating === 4 && "Very Good"}
                  {reviewData.rating === 5 && "Excellent"}
                </p>
              </div>
              <div>
                <Label>Client Satisfaction</Label>
                {renderStars(reviewData.clientSatisfaction, handleSatisfactionChange)}
                <p className="text-xs text-gray-500 mt-1">
                  How satisfied was the client with the work?
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Issues & Notes</CardTitle>
              <CardDescription>Document any issues encountered or notes for future reference</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="issues">Issues Encountered</Label>
                <div className="space-y-2">
                  {reviewData.issues.map((issue, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded">
                      <span className="text-sm">{issue}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveIssue(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add an issue encountered..."
                      value={newIssue}
                      onChange={(e) => setNewIssue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddIssue()}
                    />
                    <Button onClick={handleAddIssue} size="sm">
                      Add
                    </Button>
                  </div>
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={reviewData.notes}
                  onChange={(e) => setReviewData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes about the job completion..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Next Steps</CardTitle>
              <CardDescription>What are the next steps for this job?</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={reviewData.nextSteps}
                onChange={(e) => setReviewData(prev => ({ ...prev, nextSteps: e.target.value }))}
                placeholder="e.g., Invoice client, schedule follow-up visit, order materials for next phase..."
                rows={2}
              />
            </CardContent>
          </Card>

          {/* Follow-up Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Follow-up Actions</CardTitle>
              <CardDescription>Select which follow-up actions to perform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="request-payment"
                    checked={reviewData.requestPayment}
                    onChange={(e) => setReviewData(prev => ({ ...prev, requestPayment: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="request-payment" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Request Payment
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="request-review"
                    checked={reviewData.requestReview}
                    onChange={(e) => setReviewData(prev => ({ ...prev, requestReview: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="request-review" className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Request Review
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="send-photos"
                    checked={reviewData.photos.length > 0}
                    onChange={(e) => setReviewData(prev => ({ ...prev, photos: e.target.checked ? ["photo1", "photo2"] : [] }))}
                    className="rounded"
                  />
                  <Label htmlFor="send-photos" className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Send Photos to Client
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit Review
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
