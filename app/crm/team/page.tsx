"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Copy, Loader2, Plus, Shield, Trash2, Users, Link2, CheckCircle, Mail } from "lucide-react"
import { getTeamMembers, getWorkspaceInvites, createInvite, revokeInvite, removeMember, updateMemberRole } from "@/actions/invite-actions"
import { toast } from "sonner"

interface TeamMember {
    id: string
    name: string | null
    email: string
    role: string
    isCurrentUser?: boolean
}

interface Invite {
    id: string
    token: string
    email: string | null
    role: string
    expiresAt: Date
}

export default function TeamPage() {
    const [members, setMembers] = useState<TeamMember[]>([])
    const [invites, setInvites] = useState<Invite[]>([])
    const [loading, setLoading] = useState(true)
    const [inviteOpen, setInviteOpen] = useState(false)
    const [inviteRole, setInviteRole] = useState<"TEAM_MEMBER" | "MANAGER">("TEAM_MEMBER")
    const [inviteEmail, setInviteEmail] = useState("")
    const [generatedLink, setGeneratedLink] = useState("")
    const [creating, setCreating] = useState(false)
    const [inviteSuccess, setInviteSuccess] = useState(false)
    const [inviteError, setInviteError] = useState("")
    const [sentEmail, setSentEmail] = useState("")

    useEffect(() => {
        Promise.all([getTeamMembers(), getWorkspaceInvites()])
            .then(([m, i]) => {
                setMembers(m)
                setInvites(i as Invite[])
            })
            .finally(() => setLoading(false))
    }, [])

    const displayMembers = members

    const handleCreateInvite = async () => {
        setCreating(true)
        setInviteError("")

        // Validate email is provided for "Send Invitation"
        if (!inviteEmail.trim()) {
            setInviteError("Email is required to send an invitation")
            setCreating(false)
            return
        }

        const result = await createInvite({
            role: inviteRole,
            email: inviteEmail,
        })

        if (result.success && result.token) {
            const link = `${window.location.origin}/invite/join?token=${result.token}`
            setGeneratedLink(link)
            setSentEmail(inviteEmail)
            setInviteSuccess(true)
            toast.success(`Invite sent to ${inviteEmail}!`)

            const newInvites = await getWorkspaceInvites()
            setInvites(newInvites as Invite[])
        } else {
            setInviteError(result.error || "Failed to create invite")
            toast.error(result.error || "Failed to create invite")
        }
        setCreating(false)
    }

    const handleGenerateLink = async () => {
        setCreating(true)
        setInviteError("")

        const result = await createInvite({
            role: inviteRole,
            email: inviteEmail || undefined,
        })

        if (result.success && result.token) {
            const link = `${window.location.origin}/invite/join?token=${result.token}`
            setGeneratedLink(link)
            setInviteSuccess(true)
            toast.success("Invite link created!")

            const newInvites = await getWorkspaceInvites()
            setInvites(newInvites as Invite[])
        } else {
            setInviteError(result.error || "Failed to create invite")
            toast.error(result.error || "Failed to create invite")
        }
        setCreating(false)
    }

    const handleCopyLink = () => {
        navigator.clipboard.writeText(generatedLink)
        toast.success("Copied")
    }

    const handleRevoke = async (inviteId: string) => {
        const result = await revokeInvite(inviteId)
        if (result.success) {
            setInvites((prev) => prev.filter((i) => i.id !== inviteId))
            toast.success("Invite revoked")
        } else {
            toast.error(result.error || "Failed to revoke invite")
        }
    }

    const handleRemoveMember = async (memberId: string) => {
        const result = await removeMember(memberId)
        if (result.success) {
            setMembers((prev) => prev.filter((m) => m.id !== memberId))
            toast.success("Member removed")
        } else {
            toast.error(result.error || "Failed to remove member")
        }
    }

    const handleRoleUpdate = async (memberId: string, newRole: "MANAGER" | "TEAM_MEMBER") => {
        const result = await updateMemberRole(memberId, newRole)
        if (result.success) {
            setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
            toast.success("Role updated")
        } else {
            toast.error(result.error || "Failed to update role")
        }
    }

    const getRoleBadgeClass = (role: string) => {
        switch (role) {
            case "OWNER":
                return "bg-purple-50 text-purple-700 border-purple-200 rounded-full"
            case "MANAGER":
                return "bg-blue-50 text-blue-700 border-blue-200 rounded-full"
            default:
                return "bg-slate-100 text-slate-600 border-slate-200 rounded-full"
        }
    }

    const getRoleLabel = (role: string) => {
        switch (role) {
            case "OWNER": return "Owner"
            case "MANAGER": return "Manager"
            case "TEAM_MEMBER": return "Team Member"
            default: return role
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Team Management</h1>
                </div>

                <Dialog open={inviteOpen} onOpenChange={(open) => {
                    setInviteOpen(open)
                    if (!open) {
                        setGeneratedLink("")
                        setInviteEmail("")
                        setInviteRole("TEAM_MEMBER")
                        setInviteSuccess(false)
                        setInviteError("")
                        setSentEmail("")
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Invite Member
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Invite a Team Member</DialogTitle>
                            <DialogDescription>
                                Send an invitation email or generate a shareable link. They&apos;ll sign up and join your workspace with the role you choose below.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2 ott-card rounded-lg bg-white/80 backdrop-blur border border-slate-200/60 shadow-lg">
                            <div className="space-y-2">
                                <Label className="text-slate-800">They&apos;ll join as</Label>
                                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "TEAM_MEMBER" | "MANAGER")}>
                                    <SelectTrigger className="border-slate-300">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TEAM_MEMBER">Team Member</SelectItem>
                                        <SelectItem value="MANAGER">Manager</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    {inviteRole === "MANAGER"
                                        ? "Managers can view everything and invite others."
                                        : "Team members see the board filtered to their assigned jobs by default."}
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Email *</Label>
                                <Input
                                    placeholder="team@example.com"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    disabled={inviteSuccess}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Required to send invitation email.
                                </p>
                            </div>

                            {inviteError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">{inviteError}</p>
                                </div>
                            )}

                            {!inviteSuccess ? (
                                <div className="space-y-3">
                                    <Button
                                        onClick={handleCreateInvite}
                                        className="w-full"
                                        disabled={creating || !inviteEmail.trim()}
                                    >
                                        {creating ? (
                                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                                        ) : (
                                            <><Mail className="h-4 w-4 mr-2" /> Send Invitation</>
                                        )}
                                    </Button>
                                    <Button
                                        onClick={handleGenerateLink}
                                        variant="outline"
                                        className="w-full"
                                        disabled={creating}
                                    >
                                        {creating ? (
                                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                                        ) : (
                                            <><Link2 className="h-4 w-4 mr-2" /> Generate Invite Link</>
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4 py-6">
                                    <div className="text-center space-y-3">
                                        <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                            <CheckCircle className="w-6 h-6 text-green-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-slate-900">Invite sent to {sentEmail}!</h3>
                                            <p className="text-sm text-slate-600 mt-1">They can join your workspace using the link below.</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-slate-700">Share this link</Label>
                                        <p className="text-xs text-slate-600">
                                            Anyone who opens this link will join as <strong>{inviteRole === "MANAGER" ? "Manager" : "Team Member"}</strong>. Copy and send it (e.g. by message or email).
                                        </p>
                                        <div className="flex gap-2">
                                            <Input
                                                value={generatedLink}
                                                readOnly
                                                className="font-mono text-xs"
                                            />
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                onClick={handleCopyLink}
                                                title="Copy link"
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <Button variant="secondary" className="w-full" onClick={handleCopyLink}>
                                            <Copy className="h-4 w-4 mr-2" /> Copy invite link
                                        </Button>
                                        <p className="text-xs text-muted-foreground">
                                            Link expires in 7 days.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Active Members */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-slate-500" />
                        Members ({displayMembers.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {displayMembers.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-lg border border-border/50">
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarFallback>{(member.name || member.email)[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium text-neutral-900">{member.name || "Unnamed"}</p>
                                        <p className="text-sm text-neutral-500">{member.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {(member.isCurrentUser || member.role === "OWNER" || member.id.startsWith("fake-")) ? (
                                        <Badge variant="outline" className={getRoleBadgeClass(member.role)}>
                                            {member.role === "OWNER" && <Shield className="w-3 h-3 mr-1" />}
                                            {getRoleLabel(member.role)}
                                        </Badge>
                                    ) : (
                                        <Select
                                            value={member.role}
                                            onValueChange={(val) => handleRoleUpdate(member.id, val as "MANAGER" | "TEAM_MEMBER")}
                                        >
                                            <SelectTrigger className="h-7 w-[130px] text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="TEAM_MEMBER">Team Member</SelectItem>
                                                <SelectItem value="MANAGER">Manager</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}

                                    {!member.isCurrentUser && member.role !== "OWNER" && !member.id.startsWith("fake-") && (
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                    title="Remove from team"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Remove {member.name || member.email}?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        They will lose access to this workspace. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <div className="flex justify-end gap-2 mt-4">
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleRemoveMember(member.id)}
                                                        className="bg-red-600 hover:bg-red-700"
                                                    >
                                                        Remove
                                                    </AlertDialogAction>
                                                </div>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Pending Invites */}
            {invites.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Link2 className="w-5 h-5 text-slate-500" />
                            Pending Invites ({invites.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {invites.map((invite) => (
                                <div key={invite.id} className="flex items-center justify-between p-4 bg-amber-50/50 rounded-lg border border-amber-200/50">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                                            <Link2 className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-neutral-900">
                                                {invite.email || "Open invite link"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Expires {new Date(invite.expiresAt).toLocaleDateString("en-AU")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className={getRoleBadgeClass(invite.role)}>
                                            {getRoleLabel(invite.role)}
                                        </Badge>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-400 hover:text-red-600"
                                            onClick={() => handleRevoke(invite.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
