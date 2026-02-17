"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Moon, Phone, MessageSquare, Calendar, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

export default function AfterHoursSettingsPage() {
    const [enabled, setEnabled] = useState(true)
    const [businessHours, setBusinessHours] = useState({
        monday: { enabled: true, open: "09:00", close: "17:00" },
        tuesday: { enabled: true, open: "09:00", close: "17:00" },
        wednesday: { enabled: true, open: "09:00", close: "17:00" },
        thursday: { enabled: true, open: "09:00", close: "17:00" },
        friday: { enabled: true, open: "09:00", close: "17:00" },
        saturday: { enabled: false, open: "09:00", close: "13:00" },
        sunday: { enabled: false, open: "09:00", close: "13:00" }
    })
    const [timezone, setTimezone] = useState("Australia/Sydney")
    const [afterHoursMessage, setAfterHoursMessage] = useState("We're currently closed. Our business hours are 9am-5pm, Monday-Friday. Please leave a message and we'll get back to you as soon as possible.")
    const [emergencyContact, setEmergencyContact] = useState("")
    const [emergencyMessage, setEmergencyMessage] = useState("For emergencies, please call our emergency hotline.")
    const [autoReply, setAutoReply] = useState(true)
    const [forwardToVoicemail, setForwardToVoicemail] = useState(true)
    const [sendConfirmation, setSendConfirmation] = useState(true)

    const handleSave = () => {
        toast.success("After hours settings saved")
    }

    const handleDayToggle = (day: string) => {
        setBusinessHours(prev => ({
            ...prev,
            [day]: { ...prev[day as keyof typeof prev], enabled: !prev[day as keyof typeof prev].enabled }
        }))
    }

    const handleTimeChange = (day: string, field: 'open' | 'close', value: string) => {
        setBusinessHours(prev => ({
            ...prev,
            [day]: { ...prev[day as keyof typeof prev], [field]: value }
        }))
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">After Hours Mode</h3>
                <p className="text-sm text-muted-foreground">
                    Configure how calls and messages are handled outside business hours.
                </p>
            </div>

            {/* After Hours Status */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Moon className="h-5 w-5" />
                            <CardTitle>After Hours Mode</CardTitle>
                        </div>
                        <Switch
                            checked={enabled}
                            onCheckedChange={setEnabled}
                        />
                    </div>
                    <CardDescription>
                        Enable after hours mode to automatically handle calls and messages outside business hours.
                    </CardDescription>
                </CardHeader>
                {enabled && (
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Badge variant={enabled ? "default" : "secondary"}>
                                {enabled ? "Active" : "Inactive"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                After hours mode is currently active
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" />
                            <span>Current timezone: {timezone}</span>
                        </div>
                    </CardContent>
                )}
            </Card>

            {/* Business Hours */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        <CardTitle>Business Hours</CardTitle>
                    </div>
                    <CardDescription>
                        Set your business hours for each day of the week.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-3">
                        {Object.entries(businessHours).map(([day, hours]) => (
                            <div key={day} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Switch
                                        checked={hours.enabled}
                                        onCheckedChange={() => handleDayToggle(day)}
                                    />
                                    <span className="font-medium capitalize">{day}</span>
                                </div>
                                {hours.enabled && (
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="time"
                                            value={hours.open}
                                            onChange={(e) => handleTimeChange(day, 'open', e.target.value)}
                                            className="w-24"
                                        />
                                        <span className="text-sm text-muted-foreground">to</span>
                                        <Input
                                            type="time"
                                            value={hours.close}
                                            onChange={(e) => handleTimeChange(day, 'close', e.target.value)}
                                            className="w-24"
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select value={timezone} onValueChange={setTimezone}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Australia/Sydney">Sydney (AEST/AEDT)</SelectItem>
                                <SelectItem value="Australia/Melbourne">Melbourne (AEST/AEDT)</SelectItem>
                                <SelectItem value="Australia/Brisbane">Brisbane (AEST)</SelectItem>
                                <SelectItem value="Australia/Perth">Perth (AWST)</SelectItem>
                                <SelectItem value="Australia/Adelaide">Adelaide (ACST/ACDT)</SelectItem>
                                <SelectItem value="Australia/Darwin">Darwin (ACST)</SelectItem>
                                <SelectItem value="UTC">UTC</SelectItem>
                                <SelectItem value="America/New_York">New York (EST/EDT)</SelectItem>
                                <SelectItem value="America/Los_Angeles">Los Angeles (PST/PDT)</SelectItem>
                                <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Message Settings */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        <CardTitle>Message Settings</CardTitle>
                    </div>
                    <CardDescription>
                        Configure after hours message handling.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="after-hours-message">After Hours Message</Label>
                        <Textarea
                            id="after-hours-message"
                            value={afterHoursMessage}
                            onChange={(e) => setAfterHoursMessage(e.target.value)}
                            placeholder="Message to show/send during after hours"
                            rows={3}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="emergency-contact">Emergency Contact</Label>
                        <Input
                            id="emergency-contact"
                            value={emergencyContact}
                            onChange={(e) => setEmergencyContact(e.target.value)}
                            placeholder="Emergency phone number (optional)"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="emergency-message">Emergency Message</Label>
                        <Textarea
                            id="emergency-message"
                            value={emergencyMessage}
                            onChange={(e) => setEmergencyMessage(e.target.value)}
                            placeholder="Message for urgent inquiries"
                            rows={2}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Call Handling */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        <CardTitle>Call Handling</CardTitle>
                    </div>
                    <CardDescription>
                        Configure how incoming calls are handled after hours.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="auto-reply">Auto-Reply to Missed Calls</Label>
                            <p className="text-sm text-muted-foreground">
                                Automatically send SMS to missed calls
                            </p>
                        </div>
                        <Switch
                            id="auto-reply"
                            checked={autoReply}
                            onCheckedChange={setAutoReply}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="voicemail">Forward to Voicemail</Label>
                            <p className="text-sm text-muted-foreground">
                                Send calls to voicemail after hours
                            </p>
                        </div>
                        <Switch
                            id="voicemail"
                            checked={forwardToVoicemail}
                            onCheckedChange={setForwardToVoicemail}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="confirmation">Send Confirmation</Label>
                            <p className="text-sm text-muted-foreground">
                                Send confirmation when message is received
                            </p>
                        </div>
                        <Switch
                            id="confirmation"
                            checked={sendConfirmation}
                            onCheckedChange={setSendConfirmation}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Emergency Settings */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        <CardTitle>Emergency Settings</CardTitle>
                    </div>
                    <CardDescription>
                        Configure emergency call handling.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium text-amber-800">Emergency Calls</p>
                                <p className="text-amber-700">
                                    Calls marked as urgent will bypass after hours mode and notify you immediately.
                                </p>
                            </div>
                        </div>
                    </div>
                    {emergencyContact && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-green-600" />
                                <span className="text-sm text-green-800">
                                    Emergency contact: {emergencyContact}
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} className="w-full md:w-auto">
                    Save After Hours Settings
                </Button>
            </div>
        </div>
    )
}
