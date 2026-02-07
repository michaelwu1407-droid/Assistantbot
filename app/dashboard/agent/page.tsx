'use client';

import React from 'react';
import { DollarSign, Clock, Users, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logKeyCheckout } from '@/actions/agent-actions';

export default function AgentPage() {
  const handleKeyCheckout = async () => {
    // Mock key checkout
    await logKeyCheckout('KEY-123', 'demo-user');
    alert("Keys checked out to Sarah");
  };

  return (
    <div className="flex h-full w-full bg-slate-50 text-slate-900 font-sans">
      {/* Main Canvas */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0">
          {/* Speed-to-Lead Widget */}
          <div className="flex items-center gap-4">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-green-100 border-2 border-white flex items-center justify-center text-xs font-bold text-green-700">MS</div>
              <div className="w-8 h-8 rounded-full bg-red-100 border-2 border-white flex items-center justify-center text-xs font-bold text-red-700 animate-pulse">JD</div>
            </div>
            <div className="text-sm">
              <span className="font-medium text-slate-900">2 New Leads</span>
              <span className="text-slate-500 mx-2">•</span>
              <span className="text-red-500 font-medium">Jane (2h ago)</span>
            </div>
          </div>

          {/* Commission Calc */}
          <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
            <DollarSign className="w-4 h-4 mr-2" />
            Est. $12.5k
          </Button>
        </header>

        {/* Rotting Pipeline (Kanban Placeholder) */}
        <div className="flex-1 p-6 overflow-x-auto">
          <div className="flex gap-4 h-full min-w-max">
            {/* Column 1: New */}
            <div className="w-72 flex flex-col gap-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-slate-700">New Listings</h3>
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium">3</span>
              </div>
              
              {/* Fresh Card */}
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-slate-900">12 Smith St</h4>
                  <span className="text-xs text-slate-400">2h ago</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                  <Users className="w-3 h-3" />
                  <span>Mike Smith</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-1 rounded">$1.2m</span>
                </div>
              </div>

              {/* Rotting Card */}
              <div className="bg-red-50 p-4 rounded-lg border border-red-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-slate-900">45 High St</h4>
                  <span className="text-xs text-red-500 font-bold">8d ago</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                  <Users className="w-3 h-3" />
                  <span>Jane Doe</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">$850k</span>
                  <span className="text-xs text-red-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Stale
                  </span>
                </div>
              </div>
            </div>

            {/* Column 2: Appraised */}
            <div className="w-72 flex flex-col gap-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-slate-700">Appraised</h3>
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-medium">1</span>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm opacity-60">
                <div className="h-20 bg-slate-50 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Magic Keys Footer */}
        <div className="h-16 border-t border-slate-200 bg-white px-6 flex items-center justify-between shrink-0">
          <Button 
            variant="ghost" 
            className="flex flex-col items-center gap-1 h-auto py-2 text-slate-500 hover:text-blue-600"
            onClick={handleKeyCheckout}
          >
            <Key className="w-5 h-5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Magic Keys</span>
          </Button>
        </div>
      </div>

      {/* Right Sidebar: Matchmaker */}
      <aside className="w-80 border-l border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Matchmaker</h3>
          <p className="text-xs text-slate-500">3 active matches found</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex justify-between items-start mb-1">
              <span className="font-medium text-blue-900 text-sm">For 12 Smith St</span>
              <span className="text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full">95%</span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-xs font-bold text-slate-600">JD</div>
              <div>
                <p className="text-sm font-medium text-slate-900">John Doe</p>
                <p className="text-xs text-slate-500">Budget: $1.3m • 3 Bed</p>
              </div>
            </div>
            <Button size="sm" className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs">
              Send Listing
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
