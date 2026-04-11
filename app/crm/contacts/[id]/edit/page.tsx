import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access";
import { ContactForm } from "@/components/crm/contact-form";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditContactPage({ params }: PageProps) {
  let actor: Awaited<ReturnType<typeof requireCurrentWorkspaceAccess>>;
  try {
    actor = await requireCurrentWorkspaceAccess();
  } catch {
    redirect("/auth");
  }

  if (actor.role === "TEAM_MEMBER") {
    redirect("/crm/dashboard");
  }

  const { id } = await params;

  const contact = await db.contact.findFirst({
    where: { id, workspaceId: actor.workspaceId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      company: true,
      address: true,
      metadata: true,
    },
  });

  if (!contact) {
    notFound();
  }

  return (
    <ContactForm
      mode="edit"
      contact={{
        ...contact,
        metadata: (contact.metadata as Record<string, unknown> | null) ?? undefined,
      }}
    />
  );
}
