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
import { getCallForwardingSettings, sendCallForwardingSetupSms, updateCallForwardingSettings } from "@/actions/settings-actions"
import { getPhoneNumberStatus } from "@/actions/phone-settings"
import { buildCallForwardingCodes, type CallForwardingCarrier } from "@/lib/call-forwarding"

type ForwardMode = "full" | "backup" | "off"

const BACKUP_DELAYS = [15, 20, 25, 30, 35, 40]
const CARRIERS: Array<{ value: CallForwardingCarrier; label: string }> = [
  { value: "telstra", label: "Telstra" },
  { value: "vodafone", label: "Vodafone" },
  { value: "optus", label: "Optus" },
  { value: "other", label: "Other / not sure" },
]

export function CallForwardingCard() {
  const [active, setActive] = useState<ForwardMode>("backup")
  const [enabled, setEnabled] = useState(false)
  const [delaySec, setDelaySec] = useState(15)
  const [carrier, setCarrier] = useState<CallForwardingCarrier>("other")
  const [personalPhone, setPersonalPhone] = useState<string | null>(null)
  const [traceyPhone, setTraceyPhone] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingText, setSendingText] = useState(false)

  useEffect(() => {
    Promise.allSettled([getCallForwardingSettings(), getPhoneNumberStatus()])
      .then(([forwardingResult, phoneResult]) => {
        if (forwardingResult.status === "fulfilled") {
          setEnabled(forwardingResult.value.enabled)
          setActive(forwardingResult.value.mode)
          setDelaySec(forwardingResult.value.delaySec)
          setCarrier(forwardingResult.value.carrier)
        }

        if (phoneResult.status === "fulfilled") {
          setPersonalPhone(phoneResult.value.personalPhone || null)
          setTraceyPhone(phoneResult.value.phoneNumber || null)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const sendSetupText = async (mode: Exclude<ForwardMode, "off">, nextDelaySec: number, nextCarrier: CallForwardingCarrier) => {
    setSendingText(true)
    try {
      await sendCallForwardingSetupSms({
        mode,
        delaySec: nextDelaySec,
        carrier: nextCarrier,
      })
      toast.success("Setup text sent to your personal phone")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send setup text")
    } finally {
      setSendingText(false)
    }
  }

  const saveForwarding = async (
    nextEnabled: boolean,
    nextMode: ForwardMode,
    nextDelaySec: number = delaySec,
    nextCarrier: CallForwardingCarrier = carrier,
    options?: { sendSetupText?: boolean }
  ) => {
    setSaving(true)
    try {
      const result = await updateCallForwardingSettings({
        enabled: nextEnabled,
        mode: nextMode,
        delaySec: nextDelaySec,
        carrier: nextCarrier,
      })
      setEnabled(nextEnabled)
      setActive(result.mode as ForwardMode)
      setDelaySec(nextDelaySec)
      setCarrier(result.carrier)
      if (options?.sendSetupText && nextEnabled && nextMode !== "off") {
        await sendSetupText(result.mode as Exclude<ForwardMode, "off">, nextDelaySec, result.carrier)
      } else {
        toast.success("Phone and forwarding settings saved")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save forwarding settings")
    } finally {
      setSaving(false)
    }
  }

  const codes = traceyPhone ? buildCallForwardingCodes(traceyPhone, delaySec) : null

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PhoneForwarded className="h-5 w-5" />
          Personal phone and call forwarding
        </CardTitle>
        <CardDescription>
          Backup AI is the default: your phone rings first, then Tracey answers after 20 seconds if you miss the call.
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
            <p className="text-xs text-slate-500">Turn this on and we&apos;ll text your setup instructions from your Tracey number.</p>
          </div>
          <Switch
            id="call-forwarding-enabled"
            checked={enabled}
            disabled={loading || saving || sendingText || !personalPhone || !traceyPhone}
            onCheckedChange={(checked) =>
              saveForwarding(
                checked,
                checked ? (active === "off" ? "backup" : active) : "off",
                delaySec,
                carrier,
                { sendSetupText: checked }
              )
            }
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Your mobile carrier</Label>
            <Select
              value={carrier}
              onValueChange={(value) => {
                const nextCarrier = value as CallForwardingCarrier
                setCarrier(nextCarrier)
                void saveForwarding(enabled, enabled ? active : "off", delaySec, nextCarrier)
              }}
              disabled={loading || saving || sendingText}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CARRIERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tracey pickup timing</Label>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Backup AI is set to about {delaySec} seconds, which is roughly 3 rings at 15 seconds.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Button
            variant={active === "full" ? "default" : "outline"}
            className="h-auto flex flex-col items-center gap-2 py-4"
            disabled={!enabled || loading || saving || sendingText}
            onClick={() => saveForwarding(true, "full")}
          >
            <Shield className="h-5 w-5" />
            <span>100% AI</span>
            <span className="text-xs font-normal opacity-90">All calls go to Tracey</span>
          </Button>
          <Button
            variant={active === "backup" ? "default" : "outline"}
            className="h-auto flex flex-col items-center gap-2 py-4"
            disabled={!enabled || loading || saving || sendingText}
            onClick={() => saveForwarding(true, "backup")}
          >
            <PhoneForwarded className="h-5 w-5" />
            <span>Backup AI</span>
            <span className="text-xs font-normal opacity-90">Missed calls route to Tracey</span>
          </Button>
          <Button
            variant={active === "off" ? "default" : "outline"}
            className="h-auto flex flex-col items-center gap-2 py-4"
            disabled={loading || saving || sendingText}
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
                void saveForwarding(true, "backup", next, carrier)
              }}
              disabled={saving || sendingText}
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

        {codes && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-slate-800 dark:text-slate-200">One-tap setup</p>
                <p className="text-xs text-slate-500">
                  Tap a button on your mobile to open the dialer with the forwarding code prefilled.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={!enabled || sendingText || !personalPhone}
                onClick={() => enabled && active !== "off" && sendSetupText(active as Exclude<ForwardMode, "off">, delaySec, carrier)}
              >
                {sendingText ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend setup text"}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Button asChild variant="outline" className="justify-center">
                <a href={codes.backupHref}>Backup AI after ~{delaySec}s</a>
              </Button>
              <Button asChild variant="outline" className="justify-center">
                <a href={codes.fullHref}>Forward every call</a>
              </Button>
              <Button asChild variant="outline" className="justify-center">
                <a href={codes.offHref}>Turn forwarding off</a>
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 p-4 text-sm text-slate-600 dark:text-slate-400">
          <p className="font-medium text-slate-700 dark:text-slate-300 mb-2">Quick setup</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Set your personal phone number.</li>
            <li>Choose `Backup AI` and keep timeout at `15 seconds` if you want Tracey after about 3 rings.</li>
            <li>Turn on `Enable call forwarding` above to receive the setup text.</li>
            <li>Tap the setup text or the one-tap buttons here to apply forwarding on your mobile.</li>
            <li>Use `Forward every call` only if you want Tracey to answer before your phone rings.</li>
          </ol>
          <p className="mt-2 text-xs">Your setup text is sent from Tracey&apos;s provisioned business number to your personal phone.</p>
          {loading && (
            <p className="mt-2 text-xs flex items-center gap-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading current forwarding status...
            </p>
          )}
          {!personalPhone && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              Add your personal phone number first so we know where to send the forwarding setup text.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
