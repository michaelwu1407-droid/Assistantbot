"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, PhoneForwarded, PhoneOff, Shield, Smartphone, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { getCallForwardingSettings, sendCallForwardingSetupSms, updateCallForwardingSettings } from "@/actions/settings-actions"
import { getPhoneNumberStatus } from "@/actions/phone-settings"
import { buildCallForwardingCodes } from "@/lib/call-forwarding"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PersonalPhoneDialog } from "@/components/settings/personal-phone-dialog"

type ForwardMode = "full" | "backup" | "off"

type PhoneStatus = {
  personalPhone: string | null
  name: string
  phoneNumber: string | null
  hasPhoneNumber: boolean
}

const BACKUP_DELAYS = [12, 15, 20, 25, 30, 35, 40]

export function CallForwardingCard() {
  const [active, setActive] = useState<ForwardMode>("backup")
  const [delaySec, setDelaySec] = useState(12)
  const [status, setStatus] = useState<PhoneStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sendingText, setSendingText] = useState(false)
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false)

  const refreshStatus = useCallback(async () => {
    const [forwardingResult, phoneResult] = await Promise.allSettled([
      getCallForwardingSettings(),
      getPhoneNumberStatus(),
    ])

    if (forwardingResult.status === "fulfilled") {
      const nextMode = forwardingResult.value.enabled ? forwardingResult.value.mode : "off"
      setActive(nextMode)
      setDelaySec(forwardingResult.value.delaySec)
    }

    if (phoneResult.status === "fulfilled") {
      setStatus({
        personalPhone: phoneResult.value.personalPhone || null,
        name: phoneResult.value.name,
        phoneNumber: phoneResult.value.phoneNumber || null,
        hasPhoneNumber: !!phoneResult.value.hasPhoneNumber,
      })
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    refreshStatus()
      .catch(() => {
        toast.error("Failed to load phone settings")
      })
      .finally(() => setLoading(false))
  }, [refreshStatus])

  const businessName = status?.name || "your business"
  const personalPhone = status?.personalPhone || null
  const traceyPhone = status?.phoneNumber || null
  const hasTraceyNumber = Boolean(status?.hasPhoneNumber && traceyPhone)
  const codes = useMemo(() => (traceyPhone ? buildCallForwardingCodes(traceyPhone, delaySec) : null), [traceyPhone, delaySec])

  const saveHandling = async (
    nextMode: ForwardMode,
    nextDelaySec: number = delaySec
  ) => {
    setSaving(true)

    try {
      const result = await updateCallForwardingSettings({
        enabled: nextMode !== "off",
        mode: nextMode,
        delaySec: nextDelaySec,
      })

      setActive(result.mode as ForwardMode)
      setDelaySec(nextDelaySec)
      toast.success(nextMode === "off" ? "Call forwarding preference updated" : "Call handling preference saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save call handling")
    } finally {
      setSaving(false)
    }
  }

  const handleSendSetupText = async () => {
    if (!personalPhone) {
      toast.error("Add your personal mobile first so we know where to text the setup steps.")
      return
    }

    if (!hasTraceyNumber || active === "off") {
      toast.error("Choose a Tracey call-handling mode before sending setup steps.")
      return
    }

    setSendingText(true)
    try {
      await sendCallForwardingSetupSms({
        mode: active as Exclude<ForwardMode, "off">,
        delaySec,
        carrier: "other",
      })
      toast.success("Setup text sent to your personal mobile")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send setup text")
    } finally {
      setSendingText(false)
    }
  }

  return (
    <>
      <Card className="rounded-[18px] border-slate-200 shadow-sm dark:border-slate-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhoneForwarded className="h-5 w-5" />
            Phone & call handling
          </CardTitle>
          <CardDescription>
            Keep your personal mobile up to date, choose how Tracey should answer, and then apply the forwarding code on your phone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[18px] border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="app-micro-label">Personal mobile</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {personalPhone || "Not added yet"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Used for verification codes and Tracey setup texts.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="rounded-full"
                  onClick={() => setPhoneDialogOpen(true)}
                >
                  {personalPhone ? "Change" : "Add phone"}
                </Button>
              </div>
            </div>

            <div className="rounded-[18px] border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="space-y-1">
                <p className="app-micro-label">Tracey number</p>
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {traceyPhone || "Not provisioned yet"}
                </p>
                <p className="text-xs text-slate-500">
                  This is the business number your calls can forward to.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[18px] border border-slate-200 p-4 dark:border-slate-700">
            <div className="space-y-1">
              <Label className="text-sm font-semibold text-slate-900 dark:text-white">How should Tracey handle calls?</Label>
              <p className="text-sm text-slate-500">
                Pick the mode you want. You can change it any time.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Button
                variant={active === "backup" ? "default" : "outline"}
                className="h-auto min-h-[132px] items-start justify-start gap-2 rounded-[18px] px-4 py-4 text-left whitespace-normal"
                disabled={loading || saving || !hasTraceyNumber}
                onClick={() => saveHandling("backup")}
              >
                <div className="flex w-full items-center gap-2">
                  <PhoneForwarded className="h-4 w-4" />
                  <span>Backup AI</span>
                </div>
                <span className="whitespace-normal text-xs font-normal leading-5 opacity-90">
                  Your phone rings first. Tracey answers if you miss it.
                </span>
              </Button>

              <Button
                variant={active === "full" ? "default" : "outline"}
                className="h-auto min-h-[132px] items-start justify-start gap-2 rounded-[18px] px-4 py-4 text-left whitespace-normal"
                disabled={loading || saving || !hasTraceyNumber}
                onClick={() => saveHandling("full")}
              >
                <div className="flex w-full items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>100% AI</span>
                </div>
                <span className="whitespace-normal text-xs font-normal leading-5 opacity-90">
                  Tracey answers every call before your phone rings.
                </span>
              </Button>

              <Button
                variant={active === "off" ? "secondary" : "outline"}
                className="h-auto min-h-[132px] items-start justify-start gap-2 rounded-[18px] px-4 py-4 text-left whitespace-normal"
                disabled={loading || saving || !hasTraceyNumber}
                onClick={() => saveHandling("off")}
              >
                <div className="flex w-full items-center gap-2">
                  <PhoneOff className="h-4 w-4" />
                  <span>Forwarding off</span>
                </div>
                <span className="whitespace-normal text-xs font-normal leading-5 opacity-90">
                  Calls stay on your phone and Tracey does not answer them.
                </span>
              </Button>
            </div>

            {!hasTraceyNumber ? (
              <p className="mt-3 text-xs text-amber-600 dark:text-amber-400">
                Your Tracey number is not provisioned yet, so call forwarding can't be applied yet.
              </p>
            ) : null}
          </div>

          {active === "backup" ? (
            <div className="rounded-[18px] border border-slate-200 p-4 dark:border-slate-700">
              <div className="space-y-1">
                <Label className="text-sm font-semibold text-slate-900 dark:text-white">Backup AI pickup timing</Label>
                <p className="text-sm text-slate-500">
                  Choose how long your phone should ring before Tracey picks up.
                </p>
              </div>

              <Select
                value={String(delaySec)}
                onValueChange={(value) => {
                  const nextDelay = Number(value)
                  setDelaySec(nextDelay)
                  void saveHandling("backup", nextDelay)
                }}
                disabled={saving || sendingText || !hasTraceyNumber}
              >
                <SelectTrigger className="mt-3 w-full sm:w-[240px]">
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
          ) : null}

          {codes ? (
            <div className="rounded-[18px] border border-slate-200 p-4 dark:border-slate-700">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Apply this on your phone</p>
                  </div>
                  <p className="text-sm text-slate-500">
                    Tap the option you want on your mobile. Your dialer will open with the right forwarding code ready.
                  </p>
                </div>
                {active !== "off" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    disabled={sendingText || !personalPhone}
                    onClick={handleSendSetupText}
                  >
                    {sendingText ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
                    Text me setup steps
                  </Button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Button asChild variant={active === "backup" ? "default" : "outline"} className="h-auto min-h-[56px] justify-center rounded-[18px] px-3 py-3 text-center whitespace-normal">
                  <a href={codes.backupHref}>Backup AI after ~{delaySec}s</a>
                </Button>
                <Button asChild variant={active === "full" ? "default" : "outline"} className="h-auto min-h-[56px] justify-center rounded-[18px] px-3 py-3 text-center whitespace-normal">
                  <a href={codes.fullHref}>Forward every call</a>
                </Button>
                <Button asChild variant={active === "off" ? "secondary" : "outline"} className="h-auto min-h-[56px] justify-center rounded-[18px] px-3 py-3 text-center whitespace-normal">
                  <a href={codes.offHref}>Turn forwarding off</a>
                </Button>
              </div>

              {!personalPhone ? (
                <p className="mt-3 text-xs text-slate-500">
                  You can still use the one-tap buttons above. Add your personal mobile only if you want setup texts sent there too.
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <PersonalPhoneDialog
        businessName={businessName}
        currentPhone={personalPhone}
        open={phoneDialogOpen}
        onOpenChange={setPhoneDialogOpen}
        onStatusRefresh={refreshStatus}
      />
    </>
  )
}
