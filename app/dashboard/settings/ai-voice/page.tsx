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
import { Mic, MicOff, Settings, Volume2, Languages } from "lucide-react"
import { toast } from "sonner"

export default function AIVoiceSettingsPage() {
    const [enabled, setEnabled] = useState(false)
    const [language, setLanguage] = useState("en-US")
    const [voice, setVoice] = useState("female")
    const [speed, setSpeed] = useState("1.0")
    const [greeting, setGreeting] = useState("Thank you for calling! How can I help you today?")
    const [afterHoursMessage, setAfterHoursMessage] = useState("We're currently closed. Please leave a message and we'll get back to you during business hours.")
    const [transcribeVoicemails, setTranscribeVoicemails] = useState(true)
    const [autoRespond, setAutoRespond] = useState(false)

    const handleSave = () => {
        toast.success("AI Voice Agent settings saved")
    }

    const handleTestVoice = () => {
        toast.success("Test voice call initiated")
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">AI Voice Agent</h3>
                <p className="text-sm text-muted-foreground">
                    Configure an AI-powered voice assistant to handle incoming calls and messages.
                </p>
            </div>

            {/* Voice Status */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Mic className="h-5 w-5" />
                            <CardTitle>Voice Agent Status</CardTitle>
                        </div>
                        <Switch
                            checked={enabled}
                            onCheckedChange={setEnabled}
                        />
                    </div>
                    <CardDescription>
                        Enable the AI voice agent to automatically answer calls and respond to messages.
                    </CardDescription>
                </CardHeader>
                {enabled && (
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Badge variant={enabled ? "default" : "secondary"}>
                                {enabled ? "Active" : "Inactive"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                                Agent will answer calls when you're unavailable
                            </span>
                        </div>
                        <Button onClick={handleTestVoice} variant="outline" className="w-full">
                            <Volume2 className="h-4 w-4 mr-2" />
                            Test Voice Response
                        </Button>
                    </CardContent>
                )}
            </Card>

            {/* Voice Configuration */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        <CardTitle>Voice Configuration</CardTitle>
                    </div>
                    <CardDescription>
                        Customize the AI voice characteristics and behavior.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="language">Language</Label>
                            <Select value={language} onValueChange={setLanguage}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en-US">English (US)</SelectItem>
                                    <SelectItem value="en-GB">English (UK)</SelectItem>
                                    <SelectItem value="en-AU">English (Australia)</SelectItem>
                                    <SelectItem value="es-ES">Spanish</SelectItem>
                                    <SelectItem value="fr-FR">French</SelectItem>
                                    <SelectItem value="de-DE">German</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="voice">Voice Type</Label>
                            <Select value={voice} onValueChange={setVoice}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select voice" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="female">Female</SelectItem>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="neutral">Neutral</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="speed">Speech Speed</Label>
                        <Select value={speed} onValueChange={setSpeed}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select speed" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="0.8">Slow</SelectItem>
                                <SelectItem value="1.0">Normal</SelectItem>
                                <SelectItem value="1.2">Fast</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Message Templates */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Languages className="h-5 w-5" />
                        <CardTitle>Message Templates</CardTitle>
                    </div>
                    <CardDescription>
                        Configure the AI's greeting and response messages.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="greeting">Business Hours Greeting</Label>
                        <Textarea
                            id="greeting"
                            value={greeting}
                            onChange={(e) => setGreeting(e.target.value)}
                            placeholder="How should the AI greet callers during business hours?"
                            rows={3}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="after-hours">After Hours Message</Label>
                        <Textarea
                            id="after-hours"
                            value={afterHoursMessage}
                            onChange={(e) => setAfterHoursMessage(e.target.value)}
                            placeholder="Message for callers outside business hours"
                            rows={3}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Advanced Settings */}
            <Card>
                <CardHeader>
                    <CardTitle>Advanced Settings</CardTitle>
                    <CardDescription>
                        Configure additional AI voice agent behaviors.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="transcribe">Transcribe Voicemails</Label>
                            <p className="text-sm text-muted-foreground">
                                Automatically convert voicemail messages to text
                            </p>
                        </div>
                        <Switch
                            id="transcribe"
                            checked={transcribeVoicemails}
                            onCheckedChange={setTranscribeVoicemails}
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="auto-respond">Auto-respond to Messages</Label>
                            <p className="text-sm text-muted-foreground">
                                AI will automatically respond to text messages
                            </p>
                        </div>
                        <Switch
                            id="auto-respond"
                            checked={autoRespond}
                            onCheckedChange={setAutoRespond}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button onClick={handleSave} className="w-full md:w-auto">
                    Save Voice Settings
                </Button>
            </div>
        </div>
    )
}
