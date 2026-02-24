"use client";

import { JobPhotos } from "./job-photos";
import { JobNotes } from "./job-notes";

interface JobMediaProps {
  dealId: string;
  isPastJob?: boolean;
}

export function JobMedia({ dealId, isPastJob = false }: JobMediaProps) {
  return (
    <div className="space-y-6">
      <JobPhotos dealId={dealId} isPastJob={isPastJob} />
      <JobNotes dealId={dealId} isPastJob={isPastJob} />
    </div>
  );
}
