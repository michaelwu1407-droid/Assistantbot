import { redirect } from "next/navigation";
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access";
import { ContactForm } from "@/components/crm/contact-form";

export const dynamic = "force-dynamic";

export default async function NewContactPage() {
  let actor: Awaited<ReturnType<typeof requireCurrentWorkspaceAccess>>;
  try {
    actor = await requireCurrentWorkspaceAccess();
  } catch {
    redirect("/auth");
  }

  if (actor.role === "TEAM_MEMBER") {
    redirect("/crm/dashboard");
  }

  return <ContactForm mode="create" workspaceId={actor.workspaceId} />;
}
