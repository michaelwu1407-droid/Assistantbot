"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle, Lock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { deleteUserAccount } from "@/actions/user-actions"
import { toast } from "sonner"

interface AccountSecurityCardProps {
  userId: string
}

export function AccountSecurityCard({ userId }: AccountSecurityCardProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteReason, setDeleteReason] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

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
      toast.success("Password updated successfully!")
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to update password.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteUserAccount(userId, deleteReason)
      if (result.success) {
        await supabase.auth.signOut()
        toast.success("Account deleted successfully.")
        router.push("/auth")
      } else if (result.error?.includes("data synchronization issue")) {
        try {
          const res = await fetch("/api/delete-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId }) })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error)
          await supabase.auth.signOut()
          toast.success("Account deleted successfully.")
          router.push("/auth")
        } catch {
          toast.error("Account deletion failed. Please contact support.")
        }
      } else {
        toast.error(result.error || "Failed to delete account")
      }
    } catch {
      toast.error("An unexpected error occurred.")
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  return (
    <>
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
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
              {isLoading ? "Updating…" : "Update password"}
            </Button>
          </form>
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-sm text-red-500 hover:text-red-600 underline underline-offset-2"
            >
              Delete my account
            </button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete account
            </DialogTitle>
            <DialogDescription>
              This cannot be undone. Your account and data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Why are you leaving?</Label>
              <select
                id="reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select a reason…</option>
                <option value="not-useful">Not useful for my business</option>
                <option value="too-expensive">Too expensive</option>
                <option value="switching">Switching to another tool</option>
                <option value="missing-features">Missing features</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting || !deleteReason}>
              {isDeleting ? "Deleting…" : "Permanently delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
