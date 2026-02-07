import { useEffect, useState } from "react"
import { useShellStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Bell, Key, DollarSign, Home, User, Settings, QrCode } from "lucide-react"
import { cn } from "@/lib/utils"
// import { SpeedToLead } from "@/components/agent/speed-to-lead" // Import locally to avoid circle if any, but standard is fine
import { SpeedToLead } from "@/components/agent/speed-to-lead"
import { AgentLead } from "@/actions/agent-actions"
import { ScrollArea } from "@/components/ui/scroll-area"

// Mock Deal Card (Updated to accept any for now)
function DealCard({ deal }: { deal: any }) {
  const isRotting = false // deal.daysInactive > 7
  return (
    <div className={cn(
      "p-3 rounded-lg border shadow-sm text-sm mb-3 cursor-pointer hover:shadow-md transition-shadow",
      isRotting ? "bg-red-50 border-red-200" : "bg-white border-slate-200"
    )}>
      <div className="flex justify-between items-start mb-2">
        <span className="font-semibold text-slate-900">{deal.title}</span>
        {isRotting && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">ROTTING</span>}
      </div>
      <div className="flex justify-between text-slate-500 text-xs">
        <span>{deal.contactName}</span>
        <span>${deal.value?.toLocaleString()}</span>
      </div>
      <div className="mt-2 text-xs text-slate-400">Updated: {new Date(deal.updatedAt).toLocaleDateString()}</div>
    </div>
  )
}

interface AgentDashboardProps {
  freshLeads: AgentLead[]
  initialPipeline: any[]
}

export default function AgentDashboard({ freshLeads, initialPipeline }: AgentDashboardProps) {
  const { setViewMode, setPersona } = useShellStore()

  // Force Agent Persona on mount
  useEffect(() => {
    setPersona("AGENT")
    setViewMode("ADVANCED")
  }, [setPersona, setViewMode])

  // Simple pipeline filtering
  const getDealsByStage = (stage: string) => {
    // Map frontend stages to DB stages or just filter if they match
    // DB: NEW, CONTACTED, NEGOTIATION, WON, LOST
    // UI: "New Appraisal", "Listed", "Under Offer", "Settled"
    // Mapping for demo:
    if (stage === "New Appraisal") return initialPipeline.filter(d => d.stage === 'NEW' || d.stage === 'CONTACTED')
    if (stage === "Listed") return initialPipeline.filter(d => d.stage === 'NEGOTIATION')
    if (stage === "Under Offer") return initialPipeline.filter(d => d.stage === 'WON') // Mock
    if (stage === "Settled") return initialPipeline.filter(d => d.stage === 'INVOICED') // Mock
    return []
  }

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
        <header className="h-20 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0">
          {/* Speed-to-Lead Widget */}
          <div className="flex-1 max-w-3xl mr-8">
            <SpeedToLead leads={freshLeads} />
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
            {["New Appraisal", "Listed", "Under Offer", "Settled"].map((stage) => {
              const deals = getDealsByStage(stage)
              return (
                <div key={stage} className="w-72 flex flex-col h-full">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">{stage}</h3>
                    <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">{deals.length}</span>
                  </div>
                  <div className="flex-1 bg-slate-100/50 rounded-xl p-2 border border-slate-200/60 overflow-y-auto">
                    {deals.map(deal => (
                      <DealCard key={deal.id} deal={deal} />
                    ))}
                  </div>
                </div>
              )
            })}
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
