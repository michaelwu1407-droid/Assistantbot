import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Monitor, Eye, Layout } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export const dynamic = "force-dynamic"

export default function DisplaySettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Display</h3>
                <p className="text-sm text-muted-foreground">
                    Customize how information is displayed in the app.
                </p>
            </div>
            <Separator />
            
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Layout className="h-5 w-5" />
                            Dashboard Layout
                        </CardTitle>
                        <CardDescription>
                            Control what widgets appear on your dashboard.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Show Weather</Label>
                                <p className="text-sm text-muted-foreground">Display weather widget in header</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Show Activity Feed</Label>
                                <p className="text-sm text-muted-foreground">Display recent activity on dashboard</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Compact View</Label>
                                <p className="text-sm text-muted-foreground">Use smaller cards and tighter spacing</p>
                            </div>
                            <Switch />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Eye className="h-5 w-5" />
                            Kanban Board
                        </CardTitle>
                        <CardDescription>
                            Configure your pipeline view.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Show Deal Values</Label>
                                <p className="text-sm text-muted-foreground">Display values on deal cards</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Show Contact Avatars</Label>
                                <p className="text-sm text-muted-foreground">Display contact initials on cards</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Show Health Indicators</Label>
                                <p className="text-sm text-muted-foreground">Highlight stale and rotting deals</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
