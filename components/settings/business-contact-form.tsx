"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Phone, Mail, MapPin } from "lucide-react"
import { updateBusinessContact } from "@/actions/settings-actions"
import { toast } from "sonner"

interface BusinessContactFormProps {
  initialData?: { phone?: string; email?: string; address?: string }
}

export function BusinessContactForm({ initialData }: BusinessContactFormProps) {
  const [phone, setPhone] = useState(initialData?.phone ?? "")
  const [email, setEmail] = useState(initialData?.email ?? "")
  const [address, setAddress] = useState(initialData?.address ?? "")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateBusinessContact({ phone: phone || undefined, email: email || undefined, address: address || undefined })
      toast.success("Business contact saved")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader>
        <CardTitle>Public-facing contact</CardTitle>
        <CardDescription>
          Shown to customers when the AI agent provides your contact details.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Phone className="h-4 w-4" /> Phone
          </Label>
          <Input type="tel" placeholder="+61 400 000 000" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> Email
          </Label>
          <Input type="email" placeholder="hello@yourbusiness.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" /> Address
          </Label>
          <Textarea placeholder="Business address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save contact"}
        </Button>
      </CardContent>
    </Card>
  )
}
