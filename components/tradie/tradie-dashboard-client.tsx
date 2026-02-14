"use client"

import React, { useState, useEffect } from 'react';
import { createQuoteVariation } from '@/actions/tradie-actions';
import { DealView } from '@/actions/deal-actions';
import JobMap from './job-map';
import { JobBottomSheet } from './job-bottom-sheet';
import { PulseWidget } from '@/components/dashboard/pulse-widget';
import { Header } from "@/components/dashboard/header"
import { useShellStore } from "@/lib/store"

interface TradieDashboardClientProps {
  initialJob?: {
    id: string;
    title: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }
  todayJobs?: any[]
  userName: string
  financialStats?: {
    weeklyRevenue: number;
    outstandingDebt: number;
  }
}

export function TradieDashboardClient({ initialJob, todayJobs = [], userName = "Mate", financialStats }: TradieDashboardClientProps) {
  const userId = useShellStore(s => s.userId) ?? "anonymous";
  const [isSheetExpanded, setSheetExpanded] = useState(false);

  // Parse initial status from metadata or default to PENDING
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getStatus = (job: any) => (job?.metadata as any)?.status || job?.jobStatus || 'SCHEDULED';

  const [jobStatus, setJobStatus] = useState<'SCHEDULED' | 'TRAVELING' | 'ON_SITE' | 'COMPLETED' | 'CANCELLED'>(
    getStatus(initialJob)
  );

  // Sync state with server updates (triggered by JobStatusBar router.refresh())
  useEffect(() => {
    if (initialJob) {
      setJobStatus(getStatus(initialJob));
    }
  }, [initialJob]);

  const handleAddVariation = async (desc: string, price: number) => {
    if (!initialJob) return;
    await createQuoteVariation(initialJob.id, [{ desc, price }]);
  };

  if (!initialJob) {
    return (
      <div className="h-full w-full bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-center p-6">
          <h2 className="text-xl font-bold mb-2">All Caught Up!</h2>
          <p className="text-slate-400">No scheduled jobs for today.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-slate-950 text-slate-50 overflow-hidden font-sans">
      {/* Header Overlay - Using Local Header Component logic but positioned for Tradie view */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-slate-900/80 to-transparent pointer-events-none">
        <div className="pointer-events-auto">
          <Header
            userName={userName}
            userId={userId}
            workspaceId={useShellStore.getState().workspaceId || ""}
            onNewDeal={() => { }}
          />
        </div>
      </div>

      {/* The Pulse Widget - Positioned absolutely as per remote */}
      <PulseWidget
        className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-auto z-20"
        mode="tradie"
        weeklyRevenue={financialStats?.weeklyRevenue}
        outstandingDebt={financialStats?.outstandingDebt}
      />

      {/* Today's Job Count Indicator */}
      <div className="absolute top-32 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full border border-slate-700 text-xs font-medium text-slate-300 shadow-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          {todayJobs.length} Jobs Today
        </div>
      </div>

      {/* Map Layer */}
      <div className="absolute inset-0 bg-slate-900">
        <JobMap deals={todayJobs.length > 0 ? todayJobs : (initialJob ? [initialJob] : [])} />
      </div>

      <JobBottomSheet
        job={initialJob as DealView}
        isOpen={isSheetExpanded}
        setIsOpen={setSheetExpanded}
        onAddVariation={handleAddVariation}
        safetyCheckCompleted={initialJob.safetyCheckCompleted}
      />
    </div>
  );
}
