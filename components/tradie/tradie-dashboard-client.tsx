'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, MessageSquare, Wrench, Camera, Navigation, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { updateJobStatus } from '@/actions/tradie-actions';
import { DealView } from '@/actions/deal-actions';

interface TradieDashboardClientProps {
  initialJob?: DealView;
  userName?: string;
}

export function TradieDashboardClient({ initialJob, userName = "Mate" }: TradieDashboardClientProps) {
  const [isSheetExpanded, setSheetExpanded] = useState(false);
  
  // Parse initial status from metadata or default to PENDING
  const initialStatus = (initialJob?.metadata as any)?.status || 'PENDING';
  const [jobStatus, setJobStatus] = useState<'PENDING' | 'TRAVELING' | 'ARRIVED' | 'WORKING'>(initialStatus);
  const [showSafetyCheck, setShowSafetyCheck] = useState(false);

  const handleMainAction = async () => {
    if (!initialJob) return;

    if (jobStatus === 'PENDING') {
      setJobStatus('TRAVELING');
      await updateJobStatus(initialJob.id, 'TRAVELING');
    } else if (jobStatus === 'TRAVELING') {
      setJobStatus('ARRIVED');
      setShowSafetyCheck(true);
      await updateJobStatus(initialJob.id, 'ARRIVED');
    }
  };

  const completeSafetyCheck = () => {
    setShowSafetyCheck(false);
    setJobStatus('WORKING');
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
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 pointer-events-auto shadow-lg">
          <span className="text-sm font-medium text-emerald-400">Wk: $4.2k</span>
          <span className="mx-2 text-slate-600">|</span>
          <span className="text-sm font-medium text-red-400">Owe: $850</span>
        </div>

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

      {/* Map Placeholder */}
      <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-slate-700 flex flex-col items-center">
          <MapPin className="w-16 h-16 mb-4 opacity-20" />
          <p>Map View</p>
          <p className="text-xs mt-2 opacity-50">{initialJob.address || initialJob.company || "No Address"}</p>
          {initialJob.latitude && initialJob.longitude && (
             <p className="text-[10px] mt-1 opacity-30 font-mono">{initialJob.latitude.toFixed(4)}, {initialJob.longitude.toFixed(4)}</p>
          )}
        </div>
        {/* Mock Route Line */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
          <path d="M100,100 Q200,300 400,200 T600,400" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="8 4" />
          <circle cx="100" cy="100" r="8" fill="#10b981" />
          <circle cx="600" cy="400" r="8" fill="#ef4444" />
        </svg>
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

      {/* Bottom Sheet */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 rounded-t-3xl shadow-2xl z-30"
        initial={{ height: "15%" }}
        animate={{ height: isSheetExpanded ? "50%" : "15%" }}
        transition={{ type: "spring", damping: 20 }}
        onClick={() => setSheetExpanded(!isSheetExpanded)}
      >
        <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-4" />
        
        <div className="px-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Next Job</h3>
              <h2 className="text-xl font-bold text-white mt-1">{initialJob.title}</h2>
              <p className="text-slate-400 text-sm">8:00 AM • {initialJob.company}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
              1
            </div>
          </div>

          <AnimatePresence>
            {isSheetExpanded && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-4 gap-4 mt-8"
              >
                <Button variant="outline" className="h-20 flex flex-col gap-2 bg-slate-800 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-emerald-500/50 transition-all">
                  <Navigation className="w-6 h-6 text-emerald-400" />
                  <span className="text-xs">Navigate</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2 bg-slate-800 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-blue-500/50 transition-all">
                  <Phone className="w-6 h-6 text-blue-400" />
                  <span className="text-xs">Call</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2 bg-slate-800 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-purple-500/50 transition-all">
                  <MessageSquare className="w-6 h-6 text-purple-400" />
                  <span className="text-xs">Text</span>
                </Button>
                <Button variant="outline" className="h-20 flex flex-col gap-2 bg-slate-800 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-orange-500/50 transition-all">
                  <Wrench className="w-6 h-6 text-orange-400" />
                  <span className="text-xs">Parts</span>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Sticky Footer Button (Only visible when expanded) */}
      <AnimatePresence>
        {isSheetExpanded && jobStatus !== 'WORKING' && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="absolute bottom-0 left-0 right-0 p-4 bg-slate-900 z-40 border-t border-slate-800"
          >
            <Button 
              className={cn(
                "w-full h-14 text-lg font-bold uppercase tracking-widest transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]",
                jobStatus === 'PENDING' ? "bg-emerald-500 hover:bg-emerald-600 text-black" : "bg-blue-600 hover:bg-blue-700 text-white"
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleMainAction();
              }}
            >
              {jobStatus === 'PENDING' ? 'Start Travel' : 'Arrived'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB */}
      <AnimatePresence>
        {isSheetExpanded && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute bottom-24 right-6 w-14 h-14 bg-slate-800 rounded-full shadow-lg border border-slate-700 flex items-center justify-center z-40 text-white hover:bg-slate-700 hover:border-emerald-500 transition-colors"
          >
            <Camera className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
