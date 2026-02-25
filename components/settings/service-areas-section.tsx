"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MapPin } from "lucide-react"

export function ServiceAreasSection() {
  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Geographic coverage
        </CardTitle>
        <CardDescription>
          Validate jobs are within your service area. Postcode list or radius from a base location.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Postcodes (comma-separated)</Label>
          <Input placeholder="2000, 2001, 2002" disabled className="bg-slate-50 dark:bg-slate-900" />
        </div>
        <p className="text-xs text-slate-500">
          Full postcode or radius service area configuration coming soon. Use Business details → Service area for a general location for now.
        </p>
      </CardContent>
    </Card>
  )
}
