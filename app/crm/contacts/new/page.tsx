import { redirect } from "next/navigation";
import { getAuthUserId } from "@/lib/auth";
import { isManagerOrAbove } from "@/lib/rbac";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { ContactForm } from "@/components/crm/contact-form";

export const dynamic = "force-dynamic";

export default async function NewContactPage() {
  const userId = await getAuthUserId();
  if (!userId) redirect("/auth");

  if (!(await isManagerOrAbove())) {
    redirect("/crm/dashboard");
  }

  const workspace = await getOrCreateWorkspace(userId);

  return <ContactForm mode="create" workspaceId={workspace.id} />;
}
