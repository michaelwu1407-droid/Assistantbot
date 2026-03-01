"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PhoneForwarded, Phone, Shield, PhoneOff, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { getCallForwardingSettings, updateCallForwardingSettings } from "@/actions/settings-actions"
import { getPhoneNumberStatus } from "@/actions/phone-settings"

type ForwardMode = "full" | "backup" | "off"

const BACKUP_DELAYS = [15, 20, 25, 30, 35, 40]

export function CallForwardingCard() {
  const [active, setActive] = useState<ForwardMode>("backup")
  const [enabled, setEnabled] = useState(false)
  const [delaySec, setDelaySec] = useState(20)
  const [personalPhone, setPersonalPhone] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.allSettled([getCallForwardingSettings(), getPhoneNumberStatus()])
      .then(([forwardingResult, phoneResult]) => {
        if (forwardingResult.status === "fulfilled") {
          setEnabled(forwardingResult.value.enabled)
          setActive(forwardingResult.value.mode)
          setDelaySec(forwardingResult.value.delaySec)
        }

        if (phoneResult.status === "fulfilled") {
          setPersonalPhone(phoneResult.value.personalPhone || null)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const saveForwarding = async (nextEnabled: boolean, nextMode: ForwardMode, nextDelaySec: number = delaySec) => {
    setSaving(true)
    try {
      const result = await updateCallForwardingSettings({
        enabled: nextEnabled,
        mode: nextMode,
        delaySec: nextDelaySec,
      })
      setEnabled(nextEnabled)
      setActive(result.mode as ForwardMode)
      setDelaySec(nextDelaySec)
      toast.success("Phone and forwarding settings saved")
    } catch {
      toast.error("Failed to save forwarding settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PhoneForwarded className="h-5 w-5" />
          Personal phone and call forwarding
        </CardTitle>
        <CardDescription>
          Backup AI is the default: your phone rings first, then Travis answers after 20 seconds if you miss the call.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Personal phone
              </Label>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                {personalPhone || "No personal phone set yet"}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/settings/phone-settings">Update phone</Link>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
          <div>
            <Label htmlFor="call-forwarding-enabled" className="text-sm font-medium">Enable call forwarding</Label>
            <p className="text-xs text-slate-500">Turn this on once your carrier forwarding code is set.</p>
          </div>
          <Switch
            id="call-forwarding-enabled"
            checked={enabled}
            disabled={loading || saving}
            onCheckedChange={(checked) => saveForwarding(checked, checked ? (active === "off" ? "backup" : active) : "off")}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Button
            variant={active === "full" ? "default" : "outline"}
            className="h-auto flex flex-col items-center gap-2 py-4"
            disabled={!enabled || loading || saving}
            onClick={() => saveForwarding(true, "full")}
          >
            <Shield className="h-5 w-5" />
            <span>100% AI</span>
            <span className="text-xs font-normal opacity-90">All calls go to Travis</span>
          </Button>
          <Button
            variant={active === "backup" ? "default" : "outline"}
            className="h-auto flex flex-col items-center gap-2 py-4"
            disabled={!enabled || loading || saving}
            onClick={() => saveForwarding(true, "backup")}
          >
            <PhoneForwarded className="h-5 w-5" />
            <span>Backup AI</span>
            <span className="text-xs font-normal opacity-90">Missed calls route to Travis</span>
          </Button>
          <Button
            variant={active === "off" ? "default" : "outline"}
            className="h-auto flex flex-col items-center gap-2 py-4"
            disabled={loading || saving}
            onClick={() => saveForwarding(false, "off")}
          >
            <PhoneOff className="h-5 w-5" />
            <span>Forwarding off</span>
            <span className="text-xs font-normal opacity-90">Calls stay on your phone</span>
          </Button>
        </div>

        {active === "backup" && enabled && (
          <div className="space-y-2 rounded-lg border border-slate-200 dark:border-slate-700 p-3">
            <Label>Backup AI ring timeout</Label>
            <Select
              value={String(delaySec)}
              onValueChange={(value) => {
                const next = Number(value)
                setDelaySec(next)
                saveForwarding(true, "backup", next)
              }}
              disabled={saving}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BACKUP_DELAYS.map((delay) => (
                  <SelectItem key={delay} value={String(delay)}>
                    {delay} seconds
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-600 dark:text-slate-400">
          <p className="font-medium text-slate-700 dark:text-slate-300 mb-2">Quick setup</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Set your personal phone number.</li>
            <li>Choose `Backup AI` and keep timeout at `20 seconds` (recommended).</li>
            <li>On your mobile carrier, set "forward when unanswered" to your AI business number.</li>
            <li>Turn on `Enable call forwarding` above.</li>
          </ol>
          <p className="mt-2 text-xs">Your AI business number is in Settings (Automated calling and texting).</p>
          {loading && (
            <p className="mt-2 text-xs flex items-center gap-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading current forwarding status...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
