import { getJobDetails } from "@/actions/tradie-actions"
import { JobDetailView } from "@/components/tradie/job-detail-view"
import { notFound } from "next/navigation"

export const dynamic = 'force-dynamic'

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function JobPage({ params }: PageProps) {
    const { id } = await params
    const job = await getJobDetails(id)

    if (!job) {
        notFound()
    }

    return <JobDetailView job={job} />
}
