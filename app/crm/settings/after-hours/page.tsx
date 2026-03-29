import { redirect } from "next/navigation";

export default function AfterHoursSettingsPage() {
  redirect("/crm/settings/call-settings");
}
