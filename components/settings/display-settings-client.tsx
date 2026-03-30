"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Globe, Accessibility, Smartphone } from "lucide-react"

export function DisplaySettingsClient() {
  const [fontScale, setFontScale] = useState(() => {
    if (typeof window === "undefined") return "100"
    return window.localStorage.getItem("ui-font-scale") || "100"
  })

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}%`
  }, [fontScale])

  const handleFontScaleChange = (value: string) => {
    setFontScale(value)
    window.localStorage.setItem("ui-font-scale", value)
    document.documentElement.style.fontSize = `${value}%`
  }

  return (
    <div className="space-y-6">
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
            Apply in-app text scaling for better readability.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Text size</Label>
            <Select value={fontScale} onValueChange={handleFontScaleChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="90">Small (90%)</SelectItem>
                <SelectItem value="100">Default (100%)</SelectItem>
                <SelectItem value="110">Large (110%)</SelectItem>
                <SelectItem value="120">Extra large (120%)</SelectItem>
              </SelectContent>
            </Select>
            <p className="app-body-secondary">Applies to this browser straight away.</p>
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
          <p className="app-body-secondary">Touch behaviour adjusts automatically on mobile.</p>
        </CardContent>
      </Card>
    </div>
  )
}
