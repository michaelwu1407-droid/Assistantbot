"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Phone, Loader2 } from "lucide-react"
import { getPhoneNumberStatus } from "@/actions/phone-settings"

export function PersonalPhoneCard() {
  const [status, setStatus] = useState<{ personalPhone?: string | null; hasPersonalPhone?: boolean } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPhoneNumberStatus()
      .then((s) => setStatus({ personalPhone: s.personalPhone, hasPersonalPhone: s.hasPersonalPhone }))
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Personal phone
        </CardTitle>
        <CardDescription>
          Used for app-to-you communication (verification codes, alerts). Changing it requires SMS verification.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {status?.hasPersonalPhone && status.personalPhone
                ? status.personalPhone
                : "No phone number set"}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/settings/phone-settings">Change</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
