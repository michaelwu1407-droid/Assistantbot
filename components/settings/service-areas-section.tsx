"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Plus, X } from "lucide-react"
import { getServiceArea, updateServiceArea } from "@/actions/knowledge-actions"
import { toast } from "sonner"

export function ServiceAreasSection() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [serviceRadius, setServiceRadius] = useState(20)
  const [baseSuburb, setBaseSuburb] = useState("")
  const [serviceSuburbs, setServiceSuburbs] = useState<string[]>([])
  const [suburbDraft, setSuburbDraft] = useState("")

  useEffect(() => {
    getServiceArea()
      .then((area) => {
        if (!area) return
        setServiceRadius(area.serviceRadius)
        setBaseSuburb(area.baseSuburb)
        setServiceSuburbs(area.serviceSuburbs)
      })
      .catch(() => toast.error("Failed to load service area"))
      .finally(() => setLoading(false))
  }, [])

  const addSuburb = () => {
    const value = suburbDraft.trim()
    if (!value || serviceSuburbs.includes(value)) return
    setServiceSuburbs((prev) => [...prev, value])
    setSuburbDraft("")
  }

  const removeSuburb = (index: number) => {
    setServiceSuburbs((prev) => prev.filter((_, i) => i !== index))
  }

  const save = async () => {
    setSaving(true)
    try {
      await updateServiceArea(serviceRadius, serviceSuburbs)
      toast.success("Service area saved")
    } catch {
      toast.error("Failed to save service area")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Service areas
        </CardTitle>
        <CardDescription>
          Travis uses this to flag out-of-area jobs. Add suburb exceptions on top of your base radius.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Service radius from {baseSuburb || "base suburb"}</Label>
            <span className="text-sm font-medium text-emerald-600">{serviceRadius} km</span>
          </div>
          <Slider
            value={[serviceRadius]}
            onValueChange={(v) => setServiceRadius(v[0])}
            min={5}
            max={100}
            step={5}
            disabled={loading}
            className="w-full"
          />
        </div>

        <div className="space-y-3">
          <Label>Specific suburbs</Label>
          <div className="flex gap-2">
            <Input
              value={suburbDraft}
              onChange={(e) => setSuburbDraft(e.target.value)}
              placeholder="e.g. Parramatta, Penrith"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  addSuburb()
                }
              }}
            />
            <Button variant="outline" onClick={addSuburb} type="button">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {serviceSuburbs.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {serviceSuburbs.map((suburb, index) => (
                <Badge key={`${suburb}-${index}`} variant="secondary" className="gap-1 pr-1">
                  {suburb}
                  <button
                    type="button"
                    onClick={() => removeSuburb(index)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Button onClick={save} disabled={saving || loading} size="sm">
          {saving ? "Saving..." : "Save service areas"}
        </Button>
      </CardContent>
    </Card>
  )
}
