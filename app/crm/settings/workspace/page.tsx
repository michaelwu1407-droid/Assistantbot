import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default function WorkspaceSettingsPage() {
  redirect("/crm/settings/my-business")
}
