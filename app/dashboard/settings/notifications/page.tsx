import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, MessageSquare } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

export const dynamic = "force-dynamic"

export default function NotificationsSettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Notifications</h3>
                <p className="text-sm text-muted-foreground">
                    Configure how you receive notifications.
                </p>
            </div>
            <Separator />
            
            <div className="space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Email Notifications
                        </CardTitle>
                        <CardDescription>
                            Choose what emails you want to receive.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Deal Updates</Label>
                                <p className="text-sm text-muted-foreground">Get notified when deals are updated</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>New Contacts</Label>
                                <p className="text-sm text-muted-foreground">Get notified when new contacts are added</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Weekly Summary</Label>
                                <p className="text-sm text-muted-foreground">Receive a weekly summary of your pipeline</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="h-5 w-5" />
                            In-App Notifications
                        </CardTitle>
                        <CardDescription>
                            Control what notifications appear in the app.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Task Reminders</Label>
                                <p className="text-sm text-muted-foreground">Show reminders for upcoming tasks</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Stale Deal Alerts</Label>
                                <p className="text-sm text-muted-foreground">Alert when deals need attention</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
