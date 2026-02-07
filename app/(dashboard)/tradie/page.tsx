'use client';

import React, { useState } from 'react';
import { Cloud, Search, Bell, Navigation, Phone, MessageSquare, Wrench, Camera, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TradiePage() {
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [jobStatus, setJobStatus] = useState<'PENDING' | 'TRAVELING' | 'ARRIVED'>('PENDING');

  return (
    <div className="relative h-full w-full bg-slate-950 text-slate-50 font-sans overflow-hidden">
      {/* 1. Header: Fixed Top Bar */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-slate-950/80 to-transparent">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">Good Morning, Scott</span>
          <Cloud className="w-5 h-5 text-slate-400" />
        </div>
        
        {/* Pulse Widget Overlay */}
        <div className="absolute left-1/2 -translate-x-1/2 top-4 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-lg">
          <span className="text-xs font-medium text-neon-green">Wk: $4.2k</span>
          <span className="mx-2 text-slate-500">|</span>
          <span className="text-xs font-medium text-red-400">Owe: $850</span>
        </div>

        <div className="flex gap-3">
          <Search className="w-6 h-6" />
          <div className="relative">
            <Bell className="w-6 h-6" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
          </div>
        </div>
      </header>

      {/* 2. Main View: Map Placeholder */}
      <div className="w-full h-full bg-slate-900 flex items-center justify-center relative">
        {/* Mock Map Visuals */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#22c55e_1px,transparent_1px)] [background-size:16px_16px]" />
        <div className="text-slate-600 font-mono">GOOGLE MAP CANVAS</div>
        {/* Route Line Mock */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <path d="M100,200 Q400,100 700,500" fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray="8 4" />
          <circle cx="100" cy="200" r="8" fill="#22c55e" />
          <circle cx="700" cy="500" r="8" fill="#ef4444" />
        </svg>
      </div>

      {/* 3. Bottom Sheet */}
      <div 
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-white text-slate-900 rounded-t-3xl transition-all duration-300 ease-out z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]",
          isSheetExpanded ? "h-[50%]" : "h-[15%]"
        )}
        onClick={() => setIsSheetExpanded(!isSheetExpanded)}
      >
        {/* Handle */}
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Content */}
        <div className="p-6">
          {!isSheetExpanded ? (
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Next: Mrs. Jones</h3>
                <p className="text-slate-500 text-sm">8:00 AM - Blocked Drain</p>
              </div>
              <div className="bg-blue-100 p-2 rounded-full">
                <Navigation className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold">Mrs. Jones</h2>
                <p className="text-slate-500">12 Blackwood Ave, Paddington</p>
                <div className="mt-2 inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">URGENT</div>
              </div>

              {/* Quick Actions Row */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { icon: Navigation, label: 'Navigate', color: 'bg-blue-100 text-blue-600' },
                  { icon: Phone, label: 'Call', color: 'bg-green-100 text-green-600' },
                  { icon: MessageSquare, label: 'Text', color: 'bg-purple-100 text-purple-600' },
                  { icon: Wrench, label: 'Parts', color: 'bg-orange-100 text-orange-600' },
                ].map((action, i) => (
                  <button key={i} className="flex flex-col items-center gap-2">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${action.color}`}>
                      <action.icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Job Detail Page Elements (Visible when expanded) */}
      {isSheetExpanded && (
        <>
          {/* Sticky Footer Button */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t z-40">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setJobStatus(jobStatus === 'PENDING' ? 'TRAVELING' : 'ARRIVED');
              }}
              className={cn(
                "w-full py-4 rounded-xl font-black text-lg tracking-wide transition-colors",
                jobStatus === 'ARRIVED' ? "bg-slate-800 text-white" : "bg-[#39ff14] text-slate-950"
              )}
            >
              {jobStatus === 'PENDING' ? 'START TRAVEL' : jobStatus === 'TRAVELING' ? 'ARRIVED' : 'JOB STARTED'}
            </button>
          </div>

          {/* FAB */}
          <button className="absolute bottom-28 right-6 w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center shadow-2xl z-40 border-2 border-[#39ff14]">
            <Camera className="w-8 h-8 text-white" />
            <div className="absolute -top-1 -right-1 bg-red-500 p-1.5 rounded-full border-2 border-slate-900">
              <Mic className="w-3 h-3 text-white" />
            </div>
          </button>
        </>
      )}
    </div>
  );
}
