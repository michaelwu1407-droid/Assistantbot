"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Star, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { updateWorkspaceSettings, getWorkspaceSettings } from "@/actions/settings-actions"

interface GoogleReviewUrlSectionProps {
  initialUrl: string
}

export function GoogleReviewUrlSection({ initialUrl }: GoogleReviewUrlSectionProps) {
  const [url, setUrl] = useState(initialUrl)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const current = await getWorkspaceSettings()
      if (!current) throw new Error("Could not load settings")
      await updateWorkspaceSettings({
        agentMode: current.agentMode ?? "DRAFT",
        workingHoursStart: current.workingHoursStart ?? "08:00",
        workingHoursEnd: current.workingHoursEnd ?? "17:00",
        agendaNotifyTime: current.agendaNotifyTime ?? "07:30",
        wrapupNotifyTime: current.wrapupNotifyTime ?? "17:30",
        workspaceTimezone: current.workspaceTimezone ?? "Australia/Sydney",
        aiPreferences: current.aiPreferences ?? undefined,
        googleReviewUrl: url.trim(),
      })
      toast.success("Google Review URL saved")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" />
          <CardTitle className="text-base">Google Review link</CardTitle>
        </div>
        <CardDescription>
          Optional. Customers always go to the Earlymark feedback form first. If you add a link here, happy customers can then leave a public Google review.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="review-url">Review URL</Label>
          <div className="flex max-w-lg gap-2">
            <Input
              id="review-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://g.page/r/your-business/review"
              className="flex-1"
            />
            {url && (
              <Button variant="outline" size="icon" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Test link">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            This does not replace the internal feedback form. It only appears after a strong score, so the{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">[ReviewRequest]</code> flow can offer a public review at the end.
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
