import { getAuthUser } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Plus, Shield, Users, AlertTriangle } from "lucide-react"

export default async function TeamPage() {
    const authUser = await getAuthUser()
    if (!authUser) redirect("/login")

    // Mock data for now - could fetch from DB later
    const teamMembers = [
        {
            id: "1",
            name: authUser.name || "You",
            email: authUser.email,
            role: "Owner",
            avatar: authUser.image,
            status: "Active"
        },
        {
            id: "2",
            name: "Sarah Johnson",
            email: "sarah@example.com",
            role: "Admin",
            avatar: null,
            status: "Active"
        },
        {
            id: "3",
            name: "Mike Wilson",
            email: "mike@example.com",
            role: "Field Worker",
            avatar: null,
            status: "Active"
        },
        {
            id: "4",
            name: "Subbie Steve",
            email: "steve@subbie.com",
            role: "Subcontractor",
            avatar: null,
            status: "Invited"
        }
    ]

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* WIP Banner */}
            <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                <p className="text-sm font-medium">
                    Team Management is a work in progress and needs further development. Features shown are placeholders only.
                </p>
            </div>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-midnight">Team Management</h1>
                    <p className="text-slate-body">Manage access and permissions for your workspace.</p>
                </div>
                <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Invite Member
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-slate-500" />
                        Members
                    </CardTitle>
                    <CardDescription>
                        People with access to your workspace.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {teamMembers.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-2xl border border-border/50">
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarImage src={member.avatar || ""} />
                                        <AvatarFallback>{member.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium text-midnight">{member.name}</p>
                                        <p className="text-sm text-slate-body">{member.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Badge variant="outline" className={
                                        member.role === "Owner" ? "bg-purple-50 text-purple-700 border-purple-200 rounded-full" :
                                            member.role === "Admin" ? "bg-blue-50 text-blue-700 border-blue-200 rounded-full" :
                                                "bg-slate-100 text-slate-600 border-slate-200 rounded-full"
                                    }>
                                        {member.role === "Owner" && <Shield className="w-3 h-3 mr-1" />}
                                        {member.role}
                                    </Badge>
                                    <span className={`text-xs ${member.status === "Active" ? "text-primary font-medium" : "text-amber-600 font-medium"}`}>
                                        {member.status}
                                    </span>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
