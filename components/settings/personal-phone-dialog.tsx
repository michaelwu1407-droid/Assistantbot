"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Smartphone } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { sendPhoneVerificationCode, updatePhoneNumber } from "@/actions/phone-settings"

interface PersonalPhoneDialogProps {
  businessName: string
  currentPhone: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onPhoneUpdated?: (nextPhone: string) => void
  onStatusRefresh?: () => Promise<void> | void
}

type DialogStep = "enter" | "verify"

const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/

export function PersonalPhoneDialog({
  businessName,
  currentPhone,
  open,
  onOpenChange,
  onPhoneUpdated,
  onStatusRefresh,
}: PersonalPhoneDialogProps) {
  const [step, setStep] = useState<DialogStep>("enter")
  const [newPhoneNumber, setNewPhoneNumber] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [sendingCode, setSendingCode] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (!open) {
      setStep("enter")
      setNewPhoneNumber("")
      setVerificationCode("")
      setSendingCode(false)
      setUpdating(false)
      setError("")
      setSuccess("")
    }
  }, [open])

  const handleClose = () => {
    onOpenChange(false)
  }

  const validatePhone = () => {
    if (!newPhoneNumber.trim()) {
      setError("Enter the personal mobile number you want Tracey setup texts sent to.")
      return false
    }

    if (!PHONE_REGEX.test(newPhoneNumber.trim())) {
      setError("Enter a valid mobile number in international format, for example +61412345678.")
      return false
    }

    return true
  }

  const handleSendVerification = async () => {
    if (!validatePhone()) return

    setSendingCode(true)
    setError("")
    setSuccess("")

    try {
      const result = await sendPhoneVerificationCode({ newPhoneNumber: newPhoneNumber.trim() })

      if (result.skipVerification) {
        setSuccess("Saving your phone number and finishing phone setup...")

        const setupResponse = await fetch("/api/workspace/setup-comms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessName: businessName || "Your Business",
            ownerPhone: newPhoneNumber.trim(),
          }),
        })

        const setupResult = await setupResponse.json()

        if (!setupResponse.ok || !setupResult?.success) {
          throw new Error(setupResult?.error || "We saved your phone number, but could not finish phone setup.")
        }

        await onStatusRefresh?.()
        onPhoneUpdated?.(newPhoneNumber.trim())
        setSuccess(`Saved. Your personal mobile is now ${newPhoneNumber.trim()}.`)
        handleClose()
        return
      }

      setStep("verify")
      setSuccess(`We sent a 6-digit code to ${newPhoneNumber.trim()}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send the verification code.")
    } finally {
      setSendingCode(false)
    }
  }

  const handleVerify = async () => {
    if (verificationCode.trim().length !== 6) {
      setError("Enter the 6-digit code we texted you.")
      return
    }

    setUpdating(true)
    setError("")
    setSuccess("")

    try {
      const result = await updatePhoneNumber({
        newPhoneNumber: newPhoneNumber.trim(),
        verificationCode: verificationCode.trim(),
      })

      await onStatusRefresh?.()
      onPhoneUpdated?.(result.phoneNumber)
      setSuccess(`Saved. Your personal mobile is now ${result.phoneNumber}.`)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update your phone number.")
    } finally {
      setUpdating(false)
    }
  }

  const isBusy = sendingCode || updating

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(calc(100vw-1.5rem),34rem)] p-0">
        <div className="border-b border-slate-200/80 px-6 py-5 dark:border-white/10">
          <DialogHeader className="space-y-2">
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-emerald-600" />
              {currentPhone ? "Update personal mobile" : "Add personal mobile"}
            </DialogTitle>
            <DialogDescription className="text-[14px] leading-6">
              This is where Earlymark sends verification codes and Tracey call-forwarding setup texts.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 py-5">
          {error ? (
            <Alert variant="destructive" className="rounded-[18px]">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {success ? (
            <Alert className="rounded-[18px] border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-[18px] border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
            <Label htmlFor="personal-phone-input">Personal mobile</Label>
            <Input
              id="personal-phone-input"
              type="tel"
              value={newPhoneNumber}
              onChange={(event) => setNewPhoneNumber(event.target.value)}
              placeholder="+61412345678"
              className="mt-2"
              disabled={step === "verify" || isBusy}
            />
            <p className="mt-2 text-xs text-slate-500">
              Use international format so texts and verification work reliably.
            </p>
          </div>

          {step === "verify" ? (
            <div className="rounded-[18px] border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
              <Label htmlFor="personal-phone-code">Verification code</Label>
              <Input
                id="personal-phone-code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                placeholder="123456"
                className="mt-2"
                disabled={isBusy}
              />
              <p className="mt-2 text-xs text-slate-500">
                Enter the 6-digit code sent to {newPhoneNumber.trim()}.
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-slate-200/80 px-6 py-4 dark:border-white/10">
          {step === "verify" ? (
            <>
              <Button variant="outline" onClick={() => setStep("enter")} disabled={isBusy}>
                Change number
              </Button>
              <Button onClick={handleVerify} disabled={isBusy}>
                {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Confirm phone
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isBusy}>
                Cancel
              </Button>
              <Button onClick={handleSendVerification} disabled={isBusy}>
                {sendingCode ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {currentPhone ? "Send verification code" : "Save phone"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
