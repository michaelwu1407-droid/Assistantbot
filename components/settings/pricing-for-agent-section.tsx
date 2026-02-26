"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { DollarSign, Plus } from "lucide-react"
import { updateWorkspaceSettings } from "@/actions/settings-actions"
import { toast } from "sonner"

interface PricingForAgentSectionProps {
  initialCallOutFee: number
}

export function PricingForAgentSection({ initialCallOutFee }: PricingForAgentSectionProps) {
  const [callOutFee, setCallOutFee] = useState(String(initialCallOutFee))
  const [hourlyRate, setHourlyRate] = useState("")
  const [tasks, setTasks] = useState<{ name: string; price: string }[]>([
    { name: "", price: "" },
    { name: "", price: "" },
    { name: "", price: "" },
  ])
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateWorkspaceSettings({
        callOutFee: parseFloat(callOutFee) || 0,
      })
      toast.success("Pricing saved")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const addTask = () => setTasks((t) => [...t, { name: "", price: "" }])

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Pricing for AI quoting
        </CardTitle>
        <CardDescription>
          So the AI agent can quote accurate prices to customers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Call-out fee ($)</Label>
            <Input
              type="number"
              min={0}
              step={5}
              placeholder="0"
              value={callOutFee}
              onChange={(e) => setCallOutFee(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Hourly rate ($) — optional</Label>
            <Input
              type="number"
              min={0}
              step={5}
              placeholder="e.g. 80"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>Popular tasks (name + price)</Label>
          <p className="text-xs text-slate-500 mb-2">Top tasks the AI can quote by name</p>
          <div className="space-y-2">
            {tasks.map((t, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="e.g. Tap repair"
                  value={t.name}
                  onChange={(e) => setTasks((prev) => prev.map((p, j) => (j === i ? { ...p, name: e.target.value } : p)))}
                />
                <Input
                  type="number"
                  placeholder="Price"
                  value={t.price}
                  onChange={(e) => setTasks((prev) => prev.map((p, j) => (j === i ? { ...p, price: e.target.value } : p)))}
                  className="w-24"
                />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addTask}>
              <Plus className="h-4 w-4 mr-1" /> Add task
            </Button>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save pricing"}
        </Button>
      </CardContent>
    </Card>
  )
}
