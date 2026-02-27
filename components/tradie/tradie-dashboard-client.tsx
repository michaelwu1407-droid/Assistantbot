"use client"

import React, { useState, useEffect } from 'react';
import { createQuoteVariation } from '@/actions/tradie-actions';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Map, CheckCircle2 } from "lucide-react";
import JobMap from './job-map';
import { JobBottomSheet } from './job-bottom-sheet';
import { JobCompletionModal } from './job-completion-modal';
import { PulseWidget } from '@/components/dashboard/pulse-widget';
import { Header } from "@/components/dashboard/header"
import { useShellStore } from "@/lib/store"
import { GlobalSearch } from "@/components/layout/global-search";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

// Define the shape that JobBottomSheet expects (which we defined there as TradieJob)
interface TradieJob {
  id: string;
  title: string;
  clientName: string;
  address: string;
  status: string;
  value: number;
  scheduledAt: Date;
  description: string;
  company?: string;
  health?: { status: string };
  contactPhone?: string;
  safetyCheckCompleted: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface TradieDashboardClientProps {
  initialJob?: TradieJob;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  todayJobs?: any[];
  userName?: string;
  financialStats?: {
    weeklyRevenue: number;
    outstandingDebt: number;
  };
}

export function TradieDashboardClient({ initialJob, todayJobs = [], userName = "Mate", financialStats }: TradieDashboardClientProps) {
  const userId = useShellStore(s => s.userId) ?? "anonymous";
  const router = useRouter();
  const [isSheetExpanded, setSheetExpanded] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);

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
          <p className="text-slate-400 mb-4">No scheduled jobs for today.</p>
          <Button variant="outline" asChild className="mt-4">
            <Link href="/dashboard/map" className="gap-2">
              <Map className="mr-2 h-4 w-4" />
              Return to Map
            </Link>
          </Button>
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
          <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
            <Search className="h-5 w-5" />
          </Button>
        </div>
      </div>
      <GlobalSearch workspaceId={useShellStore.getState().workspaceId || ""} open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Today's Jobs Indicator */}
      <div className="absolute top-16 left-4 z-20 pointer-events-auto">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
          Today: {todayJobs.length} job{todayJobs.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* The Pulse Widget - Positioned absolutely as per remote */}
      <PulseWidget
        className="absolute top-20 left-1/2 -translate-x-1/2 pointer-events-auto z-20"
        mode="tradie"
        weeklyRevenue={financialStats?.weeklyRevenue}
        outstandingDebt={financialStats?.outstandingDebt}
      />

      {/* Today's Job Count Indicator */}
      <div className="absolute top-32 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center gap-2">
        <div className="bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full border border-slate-700 text-xs font-medium text-slate-300 shadow-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          {todayJobs.length} Jobs Today
        </div>
        <Link href="/dashboard/tradie/estimator" className="pointer-events-auto">
          <Button variant="secondary" size="sm" className="h-7 text-xs bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700 shadow-sm">
            + Quick Estimate
          </Button>
        </Link>
      </div>

      {/* Finish Job Button — most prominent action on active job card */}
      {(jobStatus === "ON_SITE" || jobStatus === "TRAVELING") && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 pointer-events-auto w-[calc(100%-2rem)] max-w-sm">
          <Button
            onClick={() => setCompletionModalOpen(true)}
            className="w-full h-14 text-lg font-extrabold bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-xl shadow-green-900/40 gap-2"
          >
            <CheckCircle2 className="h-6 w-6" />
            Finish Job
          </Button>
        </div>
      )}

      {/* Map Layer */}
      <div className="absolute inset-0 bg-slate-900">
        <JobMap deals={todayJobs.length > 0 ? todayJobs : (initialJob ? [initialJob] : [])} />
      </div>

      <JobBottomSheet
        job={initialJob}
        isOpen={isSheetExpanded}
        setIsOpen={setSheetExpanded}
        onAddVariation={handleAddVariation}
        safetyCheckCompleted={initialJob.safetyCheckCompleted}
      />

      {/* Job Completion Modal */}
      <JobCompletionModal
        open={completionModalOpen}
        onOpenChange={setCompletionModalOpen}
        dealId={initialJob.id}
        job={{
          id: initialJob.id,
          title: initialJob.title,
          clientName: initialJob.clientName,
          address: initialJob.address,
          value: initialJob.value,
          lat: initialJob.lat,
          lng: initialJob.lng,
        } as any}
        onSuccess={() => {
          setCompletionModalOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
