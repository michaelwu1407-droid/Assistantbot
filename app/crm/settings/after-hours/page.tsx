import { redirect } from "next/navigation";

export default function AfterHoursSettingsPage() {
  redirect("/crm/settings/automated-calling-texting");
}
