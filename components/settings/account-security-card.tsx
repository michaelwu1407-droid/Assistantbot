"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowRight, Lock, ShieldQuestion } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { deleteUserAccount } from "@/actions/user-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

interface AccountSecurityCardProps {
  userId: string
  businessName?: string
}

type DeleteReason =
  | ""
  | "not-useful"
  | "too-expensive"
  | "switching"
  | "missing-features"
  | "too-complex"
  | "other"

type DeleteStep = "reason" | "rescue" | "confirm"

function getDeleteRescueContent(reason: DeleteReason) {
  switch (reason) {
    case "too-expensive":
      return {
        title: "Check billing before you wipe the account",
        body: "If price is the issue, billing is the safer place to fix that before you lose jobs, contacts, and settings.",
        actionLabel: "Keep account and open billing",
        href: "/crm/settings/billing",
      }
    case "missing-features":
      return {
        title: "Tell us what is missing before you delete",
        body: "If something important is missing, support can tell you the best workflow or confirm plainly if it is not there yet.",
        actionLabel: "Keep account and contact support",
        href: "/crm/settings/help",
      }
    case "too-complex":
      return {
        title: "This may be a setup issue, not a delete issue",
        body: "If the app feels heavy, use help first. Most teams do not need to start over; they need a simpler setup.",
        actionLabel: "Keep account and open help",
        href: "/crm/settings/help",
      }
    case "switching":
      return {
        title: "Do not leave work behind mid-switch",
        body: "If you are moving to another tool, sort out the handover first so jobs, contacts, and conversation history do not get stranded.",
        actionLabel: "Keep account and open support",
        href: "/crm/settings/help",
      }
    case "not-useful":
      return {
        title: "If Tracey has not pulled her weight yet, fix that first",
        body: "Use help before deleting. Often the issue is setup depth, not whether the product can work for your business.",
        actionLabel: "Keep account and open help",
        href: "/crm/settings/help",
      }
    case "other":
    default:
      return {
        title: "Before you delete everything, talk to us",
        body: "If something has gone wrong, support is the safest next step before you erase the account.",
        actionLabel: "Keep account and contact support",
        href: "/crm/settings/help",
      }
  }
}

export function AccountSecurityCard({ userId, businessName = "" }: AccountSecurityCardProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteStep, setDeleteStep] = useState<DeleteStep>("reason")
  const [deleteReason, setDeleteReason] = useState<DeleteReason>("")
  const [confirmNameInput, setConfirmNameInput] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const expectedName = businessName.trim() || "DELETE"

  const rescueContent = getDeleteRescueContent(deleteReason)

  const resetDeleteFlow = () => {
    setDeleteDialogOpen(false)
    setDeleteStep("reason")
    setDeleteReason("")
    setConfirmNameInput("")
    setIsDeleting(false)
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match")
      setIsLoading(false)
      return
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword })
      if (error) throw error
      toast.success("Password updated successfully.")
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update password.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (confirmNameInput.trim() !== expectedName) {
      toast.error(`Please type "${expectedName}" exactly to confirm.`)
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteUserAccount(userId, deleteReason)
      if (result.success) {
        await supabase.auth.signOut()
        toast.success("Account deleted successfully.")
        router.push("/auth")
        return
      }

      const errorMessage = result.error?.includes("data synchronization issue")
        ? "Deletion could not be completed automatically. Please contact support so we can finish it safely."
        : result.error || "Failed to delete account."

      toast.error(errorMessage)
    } catch {
      toast.error("An unexpected error occurred while deleting the account.")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTakeOffRamp = () => {
    toast.success("Account kept.")
    resetDeleteFlow()
    router.push(rescueContent.href)
  }

  return (
    <>
      <Card className="rounded-[18px] border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-pw">Current password</Label>
              <Input
                id="current-pw"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData((p) => ({ ...p, currentPassword: e.target.value }))}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-pw">New password</Label>
              <Input
                id="new-pw"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData((p) => ({ ...p, newPassword: e.target.value }))}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Confirm new password</Label>
              <Input
                id="confirm-pw"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData((p) => ({ ...p, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update password"}
            </Button>
          </form>

          <div className="rounded-[18px] border border-red-200/70 bg-red-50/70 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-red-900">Delete account</p>
                <p className="text-sm text-red-700">
                  Permanently remove your account and business data. This cannot be undone.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete my account
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!isDeleting && !open) {
            resetDeleteFlow()
            return
          }
          setDeleteDialogOpen(open)
        }}
      >
        <DialogContent className="w-[min(calc(100vw-1.5rem),38rem)] rounded-[18px]">
          <DialogHeader className="border-b border-slate-200/70 px-6 pb-4 pt-6 dark:border-white/10">
            <DialogTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
              {deleteStep === "reason"
                ? "Before you delete everything"
                : deleteStep === "rescue"
                  ? "One more thing before you leave"
                  : "Final deletion confirmation"}
            </DialogTitle>
            <DialogDescription>
              {deleteStep === "reason"
                ? "Choose the closest reason. We may have a safer fix than deleting the whole account."
                : deleteStep === "rescue"
                  ? "Before anything is deleted, here is the safer next step based on what you told us."
                  : "This removes your login. If you are the last person on the account, it also removes the business data."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5">
            {deleteStep === "reason" && (
              <div className="space-y-4">
                <div className="rounded-[18px] border border-slate-200/70 bg-white/70 p-4">
                  <div className="space-y-2">
                    <Label htmlFor="delete-reason">Why are you leaving?</Label>
                    <Select value={deleteReason} onValueChange={(value) => setDeleteReason(value as DeleteReason)}>
                      <SelectTrigger id="delete-reason" className="h-11 rounded-[18px]">
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not-useful">Not useful for my business</SelectItem>
                        <SelectItem value="too-expensive">Too expensive</SelectItem>
                        <SelectItem value="switching">Switching to another tool</SelectItem>
                        <SelectItem value="missing-features">Missing features</SelectItem>
                        <SelectItem value="too-complex">Too complex to use</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="rounded-[18px] border border-amber-200/70 bg-amber-50/80 p-4 text-sm text-amber-900">
                  Deletion is permanent. If you are the last person on the account, jobs, contacts, templates, settings, and history are removed too.
                </div>
              </div>
            )}

            {deleteStep === "rescue" && (
              <div className="space-y-4">
                <div className="rounded-[18px] border border-emerald-200/70 bg-emerald-50/80 p-5">
                  <div className="flex items-start gap-3">
                    <ShieldQuestion className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-emerald-950">{rescueContent.title}</p>
                      <p className="text-sm text-emerald-900/90">{rescueContent.body}</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-[18px] border border-slate-200/70 bg-white/70 p-4 text-sm text-slate-700">
                  Deleting now means starting from scratch later. Your current setup, saved settings, and account history will be gone.
                </div>
              </div>
            )}

            {deleteStep === "confirm" && (
              <div className="space-y-4">
                <div className="rounded-[18px] border border-red-200/70 bg-red-50/80 p-4">
                  <p className="text-sm font-semibold text-red-900">What will happen</p>
                  <ul className="mt-2 space-y-1 text-sm text-red-800">
                    <li>Your account will be removed.</li>
                    <li>If you are the last person on the account, jobs, contacts, settings, and history will be deleted too.</li>
                    <li>This cannot be undone from the app.</li>
                  </ul>
                </div>
                <div className="space-y-2 rounded-[18px] border border-slate-200/70 bg-white/70 p-4">
                  <Label htmlFor="confirm-name">
                    Type <strong className="text-foreground">&quot;{expectedName}&quot;</strong> to confirm deletion
                  </Label>
                  <Input
                    id="confirm-name"
                    value={confirmNameInput}
                    onChange={(e) => setConfirmNameInput(e.target.value)}
                    placeholder={expectedName}
                    className="font-mono"
                    autoComplete="off"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-slate-200/70 px-6 py-4 dark:border-white/10">
            {deleteStep === "reason" && (
              <>
                <Button variant="outline" onClick={resetDeleteFlow} disabled={isDeleting}>
                  Cancel
                </Button>
                <Button onClick={() => setDeleteStep("rescue")} disabled={!deleteReason || isDeleting}>
                  Continue
                </Button>
              </>
            )}

            {deleteStep === "rescue" && (
              <>
                <Button variant="outline" onClick={() => setDeleteStep("reason")} disabled={isDeleting}>
                  Back
                </Button>
                <Button variant="outline" className="gap-2" onClick={handleTakeOffRamp} disabled={isDeleting}>
                  {rescueContent.actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="destructive" onClick={() => setDeleteStep("confirm")} disabled={isDeleting}>
                  I still want to delete
                </Button>
              </>
            )}

            {deleteStep === "confirm" && (
              <>
                <Button variant="outline" onClick={() => setDeleteStep("rescue")} disabled={isDeleting}>
                  Back
                </Button>
                <Button variant="outline" onClick={resetDeleteFlow} disabled={isDeleting}>
                  Keep my account
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => void handleDeleteAccount()}
                  disabled={isDeleting || confirmNameInput.trim() !== expectedName}
                >
                  {isDeleting ? "Deleting..." : "Delete account permanently"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
