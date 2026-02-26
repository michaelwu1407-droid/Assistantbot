"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Phone, Copy, AlertTriangle, Mic, MessageSquare, Volume2, Loader2 } from "lucide-react"
import { getPhoneNumberStatus } from "@/actions/phone-settings"
import { toast } from "sonner"

export function CallSettingsClient() {
  const [status, setStatus] = useState<{ phoneNumber?: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [emergencyBypass, setEmergencyBypass] = useState(false)
  const [recordCalls, setRecordCalls] = useState(true)
  const [personality, setPersonality] = useState<"Professional" | "Friendly">("Professional")
  const [responseLength, setResponseLength] = useState([50])

  useEffect(() => {
    getPhoneNumberStatus()
      .then((s) => setStatus({ phoneNumber: s.phoneNumber }))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
  }, [])

  const copyNumber = () => {
    if (status?.phoneNumber) {
      navigator.clipboard.writeText(status.phoneNumber)
      toast.success("Number copied")
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            AI agent business number
          </CardTitle>
          <CardDescription>
            Customer-facing number for calls and SMS. Read-only; contact support to change.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : status?.phoneNumber ? (
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-medium">{status.phoneNumber}</span>
              <Button variant="outline" size="icon" onClick={copyNumber}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No business number provisioned yet. Complete onboarding or contact support.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Emergency routing
          </CardTitle>
          <CardDescription>
            When enabled, urgent calls can bypass the AI and ring you directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>Emergency calls bypass AI</Label>
            <Switch checked={emergencyBypass} onCheckedChange={setEmergencyBypass} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Transcription settings
          </CardTitle>
          <CardDescription>
            Control call recording and transcription quality.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Record calls</Label>
            <Switch checked={recordCalls} onCheckedChange={setRecordCalls} />
          </div>
          <div className="space-y-2">
            <Label>Transcription quality</Label>
            <Select defaultValue="standard">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle>Agent behavior</CardTitle>
          <CardDescription>
            How the AI agent speaks to customers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Personality</Label>
            <Select value={personality} onValueChange={(v) => setPersonality(v as "Professional" | "Friendly")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Professional">Professional</SelectItem>
                <SelectItem value="Friendly">Friendly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Response length</Label>
            <Slider value={responseLength} onValueChange={setResponseLength} min={10} max={100} step={10} />
            <p className="text-xs text-slate-500">{responseLength[0]}%</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS templates
          </CardTitle>
          <CardDescription>
            Edit Job Confirmation, Reminder, Follow-up and other message templates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/dashboard/settings/sms-templates">Manage SMS templates</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Voice settings
          </CardTitle>
          <CardDescription>
            AI voice type, speed, and accent options.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/dashboard/settings/ai-voice">Configure voice agent</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
