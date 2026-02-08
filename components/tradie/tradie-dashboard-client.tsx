'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateJobStatus, createQuoteVariation } from '@/actions/tradie-actions';
import { DealView } from '@/actions/deal-actions';
import JobMap from './job-map';
import { JobBottomSheet } from './job-bottom-sheet';
import { PulseWidget } from '@/components/dashboard/pulse-widget';

interface TradieDashboardClientProps {
  initialJob?: DealView;
  userName?: string;
}

export function TradieDashboardClient({ initialJob, userName = "Mate" }: TradieDashboardClientProps) {
  const [isSheetExpanded, setSheetExpanded] = useState(false);

  // Parse initial status from metadata or default to PENDING
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialStatus = (initialJob?.metadata as any)?.status || 'PENDING';
  const [jobStatus, setJobStatus] = useState<'SCHEDULED' | 'TRAVELING' | 'ON_SITE' | 'COMPLETED' | 'CANCELLED'>(
    initialStatus === 'PENDING' ? 'SCHEDULED' : initialStatus
  );
  const [showSafetyCheck, setShowSafetyCheck] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleMainAction = async () => {
    if (!initialJob) return;

    if (jobStatus === 'SCHEDULED') {
      setJobStatus('TRAVELING');
      await updateJobStatus(initialJob.id, 'TRAVELING');
    } else if (jobStatus === 'TRAVELING') {
      setJobStatus('ON_SITE');
      setShowSafetyCheck(true);
      await updateJobStatus(initialJob.id, 'ON_SITE');
    } else if (jobStatus === 'ON_SITE') {
      setShowPaymentModal(true);
    }
  };

  const completeSafetyCheck = () => {
    setShowSafetyCheck(false);
    setJobStatus('ON_SITE');
  };

  const handleAddVariation = async (desc: string, price: number) => {
    if (!initialJob) return;
    await createQuoteVariation(initialJob.id, [{ desc, price }]);
    alert("Variation added!");
  };

  const handlePayment = async () => {
    // In a real app, this would integrate with Stripe Terminal / Square
    // For now, we simulate a successful card tap
    setTimeout(async () => {
      if (initialJob) {
        // We assume an invoice exists or we create one on the fly. 
        // For this demo, we'll just mark the job status as completed.
        await updateJobStatus(initialJob.id, 'COMPLETED');
        setJobStatus('COMPLETED');
        setShowPaymentModal(false);
        setSheetExpanded(false);
      }
    }, 1500);
  };

  if (!initialJob) {
    return (
      <div className="h-full w-full bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-center p-6">
          <h2 className="text-xl font-bold mb-2">All Caught Up!</h2>
          <p className="text-slate-400">No scheduled jobs for today.</p>
          <Button className="mt-4 bg-emerald-500 text-black hover:bg-emerald-400">
            Find Work
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-slate-950 text-slate-50 overflow-hidden font-sans">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <h1 className="text-lg font-bold">Good Morning, {userName}</h1>
          <div className="flex items-center text-slate-400 text-sm">
            <span className="mr-2">☁️</span> 18°C Cloudy
          </div>
        </div>

        {/* The Pulse Widget */}
        <PulseWidget className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto" mode="tradie" />

        <div className="flex gap-2 pointer-events-auto">
          <Button size="icon" variant="ghost" className="rounded-full bg-slate-900/50 hover:bg-slate-800 text-slate-200">
            <span className="sr-only">Search</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </Button>
          <div className="relative">
            <Button size="icon" variant="ghost" className="rounded-full bg-slate-900/50 hover:bg-slate-800 text-slate-200">
              <span className="sr-only">Notifications</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </Button>
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-950"></span>
          </div>
        </div>
      </div>

      {/* Map Layer */}
      <div className="absolute inset-0 bg-slate-900">
        <JobMap deals={[initialJob]} />
      </div>

      {/* Safety Check Modal */}
      <AnimatePresence>
        {showSafetyCheck && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
                <h2 className="text-xl font-bold text-white">Safety Check</h2>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-xl">
                  <span className="font-medium">Power Off?</span>
                  <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-800 rounded-xl">
                  <span className="font-medium">Site Clear?</span>
                  <div className="w-12 h-6 bg-emerald-500 rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
              </div>

              <Button
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-lg"
                onClick={completeSafetyCheck}
              >
                Safe to Proceed
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="absolute inset-0 z-50 bg-emerald-600 flex flex-col items-center justify-center p-6 text-white">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center space-y-8"
            >
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <CreditCard className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-2">Tap to Pay</h2>
                <p className="text-emerald-100">Total Due</p>
                <p className="text-5xl font-black mt-2">${initialJob.value.toLocaleString()}</p>
              </div>
              <Button
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-emerald-600 mt-8"
                onClick={handlePayment}
              >
                Simulate Tap
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <JobBottomSheet
        job={initialJob}
        isOpen={isSheetExpanded}
        setIsOpen={setSheetExpanded}
        status={jobStatus}
        onAction={handleMainAction}
        onAddVariation={handleAddVariation}
      />
    </div>
  );
}
