import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/crm/contacts/${id}`);
}
