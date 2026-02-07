"use client"

import { useEffect, useState } from "react"
import { useShellStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, Key, DollarSign, Home, User, Settings, QrCode } from "lucide-react"
import { cn } from "@/lib/utils"

// Mock Deal Card
function DealCard({ deal }: { deal: any }) {
  const isRotting = deal.daysInactive > 7
  return (
    <div className={cn(
      "p-3 rounded-lg border shadow-sm text-sm mb-3 cursor-pointer hover:shadow-md transition-shadow",
      isRotting ? "bg-red-50 border-red-200" : "bg-white border-slate-200"
    )}>
      <div className="flex justify-between items-start mb-2">
        <span className="font-semibold text-slate-900">{deal.address}</span>
        {isRotting && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">ROTTING</span>}
      </div>
      <div className="flex justify-between text-slate-500 text-xs">
        <span>{deal.client}</span>
        <span>{deal.price}</span>
      </div>
      <div className="mt-2 text-xs text-slate-400">In stage: {deal.daysInactive}d</div>
    </div>
  )
}

export default function AgentDashboard() {
  const { setViewMode, setPersona } = useShellStore()

  // Force Agent Persona on mount
  useEffect(() => {
    setPersona("AGENT")
    setViewMode("ADVANCED")
  }, [])

  return (
    <div className="h-full w-full bg-slate-50 text-slate-900 flex overflow-hidden">
      {/* 1. Sidebar Rail */}
      <div className="w-16 bg-slate-900 flex flex-col items-center py-6 gap-6 text-slate-400 border-r border-slate-800">
        <div className="h-8 w-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold mb-4">Pj</div>
        <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-white"><Home className="h-5 w-5" /></button>
        <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><User className="h-5 w-5" /></button>
        <div className="mt-auto flex flex-col gap-4">
          {/* Magic Keys */}
          <button className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-lg hover:brightness-110 shadow-lg" title="Magic Keys">
            <Key className="h-5 w-5" />
          </button>
          <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors"><Settings className="h-5 w-5" /></button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 2. Header */}
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0">
          {/* Speed-to-Lead Widget */}
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
              <div className="h-6 w-6 rounded-full bg-green-200 text-green-700 flex items-center justify-center text-xs font-bold">MJ</div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-700">Mike (Smith St)</span>
                <span className="text-[10px] text-green-600">2m ago</span>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full border border-red-100 animate-pulse">
              <div className="h-6 w-6 rounded-full bg-red-200 text-red-700 flex items-center justify-center text-xs font-bold">JS</div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-700">Jane (High St)</span>
                <span className="text-[10px] text-red-600">2h ago</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2 text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100">
              <DollarSign className="h-4 w-4" />
              <span>Commission</span>
            </Button>
            <Button size="icon" variant="ghost">
              <Bell className="h-5 w-5 text-slate-400" />
            </Button>
          </div>
        </header>

        {/* 3. Rotting Pipeline (Kanban) */}
        <main className="flex-1 overflow-x-auto p-6 bg-slate-50/50">
          <div className="flex gap-4 h-full min-w-[1000px]">
            {["New Appraisal", "Listed", "Under Offer", "Settled"].map((stage) => (
              <div key={stage} className="w-72 flex flex-col h-full">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">{stage}</h3>
                  <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">3</span>
                </div>
                <div className="flex-1 bg-slate-100/50 rounded-xl p-2 border border-slate-200/60 overflow-y-auto">
                  {/* Mock Deals */}
                  <DealCard deal={{ address: "12 Smith St", client: "John Doe", price: "$1.2m", daysInactive: 2 }} />
                  <DealCard deal={{ address: "88High St", client: "Jane Smith", price: "$950k", daysInactive: 12 }} /> {/* Rotting */}
                  <DealCard deal={{ address: "44 Park Rd", client: "Bob Brown", price: "$1.8m", daysInactive: 5 }} />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {/* 4. Matchmaker Sidebar (Collapsible) */}
      <div className="w-80 border-l border-slate-200 bg-white flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-sm text-slate-800">Matchmaker Feed</h3>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-xs font-bold text-blue-700">New Match Found</span>
              </div>
              <p className="text-sm text-slate-700 mb-2">3 Buyers found for <strong>12 Smith St</strong></p>
              <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs">Review Matches</Button>
            </div>
          </div>
        </ScrollArea>
        <div className="p-4 border-t border-slate-100">
          <Button variant="outline" className="w-full gap-2">
            <QrCode className="h-4 w-4" />
            <span>Kiosk Mode</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
