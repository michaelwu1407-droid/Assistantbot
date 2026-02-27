"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WorkspaceForm } from "@/app/dashboard/settings/workspace/workspace-form"

interface MyBusinessDetailsProps {
  workspaceId: string
  initialData: { name: string; specialty: string; location: string }
}

export function MyBusinessDetails({ workspaceId, initialData }: MyBusinessDetailsProps) {
  return (
    <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader>
        <CardTitle>Business name and service area</CardTitle>
        <CardDescription>
          Stored for AI agent use when talking to customers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <WorkspaceForm
          workspaceId={workspaceId}
          initialData={{
            name: initialData.name,
            specialty: initialData.specialty || "Plumber",
            location: initialData.location || undefined,
          }}
        />
      </CardContent>
    </Card>
  )
}
