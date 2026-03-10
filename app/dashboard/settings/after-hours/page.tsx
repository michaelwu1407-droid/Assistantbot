import { redirect } from "next/navigation";

export default function AfterHoursSettingsPage() {
  redirect("/dashboard/settings/automated-calling-texting");
}
