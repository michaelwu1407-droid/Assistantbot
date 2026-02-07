'use client';

import React from 'react';
import { DollarSign, Clock, Key, Home, Users, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AgentPage() {
  return (
    <div className="flex h-full w-full bg-slate-50 text-slate-900 font-sans">
      {/* Main Canvas: Rotting Pipeline */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* 1. Header */}
        <header className="h-16 border-b bg-white flex items-center justify-between px-6">
          {/* Speed-to-Lead Widget */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Speed to Lead</span>
            <div className="flex gap-2">
              <div className="flex items-center gap-2 bg-green-50 border border-green-100 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-green-700">Mike (Smith St) - 2m</span>
              </div>
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-red-700">Jane (High St) - 2h</span>
              </div>
            </div>
          </div>

          {/* Commission Calc */}
          <button className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
            <DollarSign className="w-5 h-5" />
          </button>
        </header>

        {/* 2. Kanban Board */}
        <div className="flex-1 p-6 overflow-x-auto">
          <div className="flex gap-6 h-full">
            {/* Column: New Leads */}
            <div className="w-80 flex-shrink-0 flex flex-col gap-4">
              <h3 className="font-bold text-slate-700 flex justify-between">
                New Leads <span className="bg-slate-200 px-2 rounded-full text-xs py-0.5">4</span>
              </h3>
              
              {/* Fresh Deal */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between mb-2">
                  <span className="font-bold">12 Smith St</span>
                  <span className="text-xs text-slate-400">Just now</span>
                </div>
                <p className="text-sm text-slate-600">Buyer Inquiry: Tom Wilson</p>
                <div className="mt-3 flex gap-2">
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded">Hot</span>
                </div>
              </div>

              {/* Rotting Deal */}
              <div className="bg-red-50 p-4 rounded-xl shadow-sm border border-red-100 cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-red-400" />
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-slate-800">44 Oak Lane</span>
                  <span className="text-xs text-red-500 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> 8d
                  </span>
                </div>
                <p className="text-sm text-slate-600">Vendor Update Required</p>
              </div>
            </div>

            {/* Column: Negotiations */}
            <div className="w-80 flex-shrink-0 flex flex-col gap-4">
              <h3 className="font-bold text-slate-700">Negotiations</h3>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <span className="font-bold">Penthouse 4</span>
                <p className="text-sm text-slate-600 mt-1">Offer: $1.2m (Pending)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Magic Keys Rail */}
        <div className="h-16 bg-white border-t flex items-center justify-around px-4">
          <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-navy-600">
            <Home className="w-5 h-5" />
            <span className="text-[10px]">Listings</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-navy-600">
            <div className="bg-navy-50 p-2 rounded-full -mt-6 border-4 border-slate-50">
              <Key className="w-6 h-6 text-navy-700" />
            </div>
            <span className="text-[10px] font-bold text-navy-700">Keys</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-navy-600">
            <Users className="w-5 h-5" />
            <span className="text-[10px]">Contacts</span>
          </button>
        </div>
      </div>

      {/* 3. Sidebar: Matchmaker Feed */}
      <aside className="w-80 border-l bg-white flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg text-navy-900">Matchmaker</h2>
          <p className="text-xs text-slate-500">3 Buyers found for 12 Smith St</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-sm">Sarah Jenkins</h4>
                <p className="text-xs text-slate-500">Budget: $1.1m - $1.3m</p>
                <p className="text-xs text-green-600 mt-1 font-medium">95% Match</p>
              </div>
              <button className="ml-auto text-slate-400 hover:text-navy-600">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
