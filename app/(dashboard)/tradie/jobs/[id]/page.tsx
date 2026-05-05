import { getJobDetails } from "@/actions/tradie-actions";
import { JobDetailView } from "@/components/tradie/job-detail-view";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function toTradieStatus(status: string) {
  switch (status) {
    case "TRAVELING":
    case "ON_SITE":
    case "COMPLETED":
    case "CANCELLED":
    case "SCHEDULED":
      return status;
    default:
      return "SCHEDULED";
  }
}

interface JobDetailProps {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: JobDetailProps) {
  const { id } = await params;
  const job = await getJobDetails(id);

  if (!job) {
    notFound();
  }

  return <JobDetailView job={{ ...job, status: toTradieStatus(job.status) }} />;
}
