"use client"

import { useShellStore } from "@/lib/store"
import { AssistantPane } from "@/components/core/assistant-pane"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { motion, AnimatePresence } from "framer-motion"
import { TutorialOverlay } from "@/components/tutorial/tutorial-overlay"

export function Shell({ children, chatbot }: { children: React.ReactNode; chatbot?: React.ReactNode }) {
  const { viewMode } = useShellStore()

  // Import TutorialOverlay locally if needed or at top level
  // const TutorialOverlay = dynamic(() => import('@/components/tutorial/tutorial-overlay').then(mod => mod.TutorialOverlay))
  // But standard import is fine for now.

  if (viewMode === "BASIC") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4 relative overflow-hidden">

        {/* Decorative Background for Basic Mode */}
        <div className="absolute inset-0 bg-gradient-mesh opacity-20 pointer-events-none" />

        <div className="z-10 w-full max-w-2xl h-[85vh] shadow-2xl rounded-2xl overflow-hidden border border-border bg-card/80 backdrop-blur-sm relative">
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
