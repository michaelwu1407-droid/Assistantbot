"use client"

import { useShellStore } from "@/lib/store"
import { AssistantPane } from "@/components/core/assistant-pane"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { motion, AnimatePresence } from "framer-motion"

export function Shell({ children }: { children: React.ReactNode }) {
  const { viewMode } = useShellStore()

  if (viewMode === "BASIC") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-4 relative">
        <AnimatePresence>
          {/* Canvas hidden or sliding in background layer */}
        </AnimatePresence>

        {/* Central Chatbot */}
        <motion.div
          layoutId="assistant-pane"
          className="w-full max-w-2xl h-[80vh] shadow-2xl rounded-2xl overflow-hidden border border-slate-200 bg-white"
        >
          <AssistantPane />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-slate-50">
      <ResizablePanelGroup direction="horizontal">
        {/* Left Canvas - 70% */}
        <ResizablePanel defaultSize={70} minSize={30}>
          <div className="h-full w-full overflow-hidden relative">
            {children}
          </div>
        </ResizablePanel>

        <ResizableHandle />

        {/* Right Chatbot - 30% */}
        <ResizablePanel defaultSize={30} minSize={20}>
          <motion.div layoutId="assistant-pane" className="h-full w-full border-l border-slate-200">
            <AssistantPane />
          </motion.div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
