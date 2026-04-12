"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function SupportRequestPanel() {
  const [loading, setLoading] = useState(false)
  const [submissionState, setSubmissionState] = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [priority, setPriority] = useState("medium")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    setLoading(true)
    setSubmissionState(null)

    const formData = new FormData(form)
    const subject = formData.get("subject") as string
    const message = formData.get("message") as string

    try {
      const response = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, priority }),
      })

      const result = await response.json()

      if (result.success) {
        setSubmissionState({
          type: "success",
          message: "Support request sent. We'll get back to you within 24 hours.",
        })
        setPriority("medium")
        form.reset()
      } else {
        setSubmissionState({
          type: "error",
          message: result.error || "Failed to send support request",
        })
      }
    } catch {
      setSubmissionState({
        type: "error",
        message: "Failed to send support request. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card id="support-request">
        <CardHeader>
          <CardTitle>Support request</CardTitle>
          <CardDescription>
            Tell us what is blocking you and we&apos;ll help you fix it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submissionState?.type === "error" && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{submissionState.message}</AlertDescription>
            </Alert>
          )}
          {submissionState?.type === "success" && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{submissionState.message}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  placeholder="e.g. Billing issue or phone setup problem"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - General question</SelectItem>
                    <SelectItem value="medium">Medium - Something not working as expected</SelectItem>
                    <SelectItem value="high">High - Stopping work</SelectItem>
                    <SelectItem value="urgent">Urgent - Business critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Tell us what happened, what you expected, and what you need help with."
                rows={6}
                required
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send support request"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

    </div>
  )
}
