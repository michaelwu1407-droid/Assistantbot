"use client"

import { useSearchParams } from "next/navigation"
import { useEffect } from "react"
import { useShellStore } from "@/lib/store"
import { AssistantPane } from "@/components/core/assistant-pane"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { TutorialOverlay } from "@/components/tutorial/tutorial-overlay"

export function Shell({ children, chatbot }: { children: React.ReactNode; chatbot?: React.ReactNode }) {
  const { viewMode, setViewMode } = useShellStore()
  const searchParams = useSearchParams()

  // Activate tutorial if requested via URL
  useEffect(() => {
    if (searchParams.get("tutorial") === "true") {
      setViewMode("TUTORIAL")
    }
  }, [searchParams, setViewMode])

  if (viewMode === "BASIC") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4 md:p-6 relative overflow-hidden">

        {/* Decorative Background for Basic Mode */}
        <div className="absolute inset-0 bg-gradient-mesh opacity-10 pointer-events-none" />

        {/* Mode Toggle Button - Floating */}
        <button
          id="mode-toggle-btn"
          onClick={() => setViewMode("ADVANCED")}
          className="absolute top-4 right-4 z-20 flex items-center gap-2 px-4 py-2 bg-card/80 backdrop-blur-sm border border-border rounded-full text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-card transition-all shadow-lg hover:shadow-xl"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          Advanced Mode
        </button>

        {/* Main Chat Container - Large & Immersive */}
        <div className="z-10 w-full max-w-4xl h-full md:h-[92vh] shadow-2xl rounded-2xl overflow-hidden border border-border/50 bg-background/60 backdrop-blur-xl relative flex flex-col">
          {/* ID for Spotlight */}
          <div id="assistant-pane" className="h-full w-full">
            {chatbot || <AssistantPane />}
          </div>
        </div>
      </div>
    )
  }

  // ADVANCED & TUTORIAL view share the split layout
  return (
    <div className="h-screen w-full bg-background relative flex flex-col">
      {/* Tutorial Overlay sits on top */}
      <TutorialOverlay />

      <ResizablePanelGroup direction="horizontal" className="flex-1 h-full">
        {/* Left Canvas - 75% for Desktop, handled by resizable panels */}
        <ResizablePanel defaultSize={75} minSize={30} id="main-canvas-panel">
          <div id="main-canvas" className="h-full w-full overflow-hidden relative bg-muted/30">
            {children}
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Chatbot - 25% */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={50} id="assistant-panel">
          <div id="assistant-pane" className="h-full w-full border-l border-border bg-card">
            {chatbot || <AssistantPane />}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
