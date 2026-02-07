import { getJobDetails } from "@/actions/tradie-actions"
import JobDetailView from "@/components/jobs/job-detail-view"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

interface JobPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function JobPage({ params }: JobPageProps) {
    const { id } = await params
    const job = await getJobDetails(id)

    if (!job) {
        notFound()
    }

    return <JobDetailView job={job} />
}
