"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Copy, Loader2, Plus, Shield, Trash2, Users, Link2, CheckCircle, Mail } from "lucide-react"
import { getTeamMembers, getWorkspaceInvites, createInvite, revokeInvite, removeMember } from "@/actions/invite-actions"
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

const FAKE_MEMBERS: TeamMember[] = [
    { id: "fake-1", name: "Alex Chen", email: "alex@example.com", role: "TEAM_MEMBER", isCurrentUser: false },
    { id: "fake-2", name: "Sam Taylor", email: "sam@example.com", role: "MANAGER", isCurrentUser: false },
    { id: "fake-3", name: "Jordan Lee", email: "jordan@example.com", role: "TEAM_MEMBER", isCurrentUser: false },
]

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

    const displayMembers = members.length >= 2 ? members : [...members, ...FAKE_MEMBERS]

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
        toast.success("Link copied to clipboard!")
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

    const handleRemoveMember = async (memberId: string, memberName: string) => {
        if (!confirm(`Remove ${memberName || memberId} from the team? They will lose access to this workspace.`)) return
        const result = await removeMember(memberId)
        if (result.success) {
            setMembers((prev) => prev.filter((m) => m.id !== memberId))
            toast.success("Member removed")
        } else {
            toast.error(result.error || "Failed to remove member")
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
                    <h1 className="text-2xl font-bold tracking-tight text-midnight">Team Management</h1>
                    <p className="text-slate-body">Manage access and permissions for your workspace.</p>
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
                                Send an invitation email or generate a shareable link. They&apos;ll sign up and automatically join your workspace.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2 ott-card rounded-xl bg-white/80 backdrop-blur border border-slate-200/60 shadow-lg">
                            <div className="space-y-2">
                                <Label>Role</Label>
                                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "TEAM_MEMBER" | "MANAGER")}>
                                    <SelectTrigger>
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
                                        : "Team members have a simplified view focused on their assigned jobs."}
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
                                        <Label className="text-sm font-medium text-slate-700">Manual sharing link</Label>
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
                                            >
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground text-center">
                                            This link expires in 7 days.
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
                    <CardDescription>
                        People with access to your workspace.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {displayMembers.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-2xl border border-border/50">
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarFallback>{(member.name || member.email)[0]?.toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium text-midnight">{member.name || "Unnamed"}</p>
                                        <p className="text-sm text-slate-body">{member.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className={getRoleBadgeClass(member.role)}>
                                        {member.role === "OWNER" && <Shield className="w-3 h-3 mr-1" />}
                                        {getRoleLabel(member.role)}
                                    </Badge>
                                    {!member.isCurrentUser && member.role !== "OWNER" && !member.id.startsWith("fake-") && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleRemoveMember(member.id, member.name || member.email)}
                                            title="Remove from team"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
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
                                <div key={invite.id} className="flex items-center justify-between p-4 bg-amber-50/50 rounded-2xl border border-amber-200/50">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                                            <Link2 className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-midnight">
                                                {invite.email || "Open invite link"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Expires {new Date(invite.expiresAt).toLocaleDateString()}
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
