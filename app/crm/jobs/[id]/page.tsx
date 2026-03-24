import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LegacyJobPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/crm/deals/${id}`);
}
