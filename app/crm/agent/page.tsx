import { redirect } from "next/navigation";

export default function LegacyAgentPage() {
  redirect("/crm/settings/agent");
}

