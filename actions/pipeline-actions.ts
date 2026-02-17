"use server"

import { IndustryType, DealStage } from "@prisma/client"

export type PipelineStage = {
    id: string
    title: string
    color: string
    mappedStage: DealStage
}

const TRADIE_STAGES: PipelineStage[] = [
    { id: "new", title: "New Job", color: "bg-blue-500", mappedStage: "NEW" },
    { id: "contacted", title: "Quoted", color: "bg-indigo-500", mappedStage: "CONTACTED" },
    { id: "negotiation", title: "In Progress", color: "bg-amber-500", mappedStage: "NEGOTIATION" },
    { id: "won", title: "Completed", color: "bg-emerald-500", mappedStage: "WON" },
    { id: "lost", title: "Lost", color: "bg-muted-foreground", mappedStage: "LOST" },
]

const AGENT_STAGES: PipelineStage[] = [
    { id: "new", title: "New Listing", color: "bg-blue-500", mappedStage: "NEW" },
    { id: "contacted", title: "Appraised", color: "bg-indigo-500", mappedStage: "CONTACTED" },
    { id: "negotiation", title: "Under Offer", color: "bg-amber-500", mappedStage: "NEGOTIATION" },
    { id: "won", title: "Settled", color: "bg-emerald-500", mappedStage: "WON" },
    { id: "lost", title: "Withdrawn", color: "bg-muted-foreground", mappedStage: "LOST" },
]

const DEFAULT_STAGES: PipelineStage[] = [
    { id: "new", title: "New Lead", color: "bg-blue-500", mappedStage: "NEW" },
    { id: "contacted", title: "Contacted", color: "bg-indigo-500", mappedStage: "CONTACTED" },
    { id: "negotiation", title: "Negotiation", color: "bg-amber-500", mappedStage: "NEGOTIATION" },
    { id: "won", title: "Won", color: "bg-emerald-500", mappedStage: "WON" },
    { id: "lost", title: "Lost", color: "bg-muted-foreground", mappedStage: "LOST" },
]

export async function getIndustryStages(industryType: IndustryType | null): Promise<PipelineStage[]> {
    if (industryType === "TRADES") {
        return TRADIE_STAGES
    }
    if (industryType === "REAL_ESTATE") {
        return AGENT_STAGES
    }
    return DEFAULT_STAGES
}
