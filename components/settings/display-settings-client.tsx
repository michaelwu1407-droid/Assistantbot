"use client"

import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Sun, Globe, Accessibility, Smartphone } from "lucide-react"
import { useState } from "react"

export function DisplaySettingsClient() {
  const { theme, setTheme } = useTheme()
  const [fontSize, setFontSize] = useState([100])
  const [highContrast, setHighContrast] = useState(false)
  const [touchFriendly, setTouchFriendly] = useState(false)

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Theme
          </CardTitle>
          <CardDescription>
            Light, dark, or follow your system preference.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={theme ?? "system"} onValueChange={(v) => setTheme(v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System (auto)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Language and region
          </CardTitle>
          <CardDescription>
            Language, date format, and currency.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Language</Label>
            <Select defaultValue="en">
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Date format</Label>
            <Select defaultValue="DD/MM/YYYY">
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select defaultValue="AUD">
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AUD">AUD</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="NZD">NZD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Accessibility className="h-5 w-5" />
            Accessibility
          </CardTitle>
          <CardDescription>
            Font size, contrast, and screen reader options.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Font size</Label>
            <Slider value={fontSize} onValueChange={setFontSize} min={80} max={140} step={10} />
            <p className="text-xs text-slate-500">{fontSize[0]}%</p>
          </div>
          <div className="flex items-center justify-between">
            <Label>High contrast</Label>
            <Switch checked={highContrast} onCheckedChange={setHighContrast} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile
          </CardTitle>
          <CardDescription>
            PWA install and mobile preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline">Install PWA</Button>
          <div className="flex items-center justify-between">
            <Label>Touch-friendly controls</Label>
            <Switch checked={touchFriendly} onCheckedChange={setTouchFriendly} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
