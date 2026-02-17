"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { useShellStore } from "@/lib/store"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { TutorialOverlay } from "@/components/tutorial/tutorial-overlay"
import { Sidebar } from "@/components/core/sidebar"
import { MobileSidebar } from "@/components/layout/mobile-sidebar"
import { Switch } from "@/components/ui/switch"
import { Layers, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

export function Shell({ children, chatbot }: { children: React.ReactNode; chatbot?: React.ReactNode }) {
  const { viewMode, setViewMode } = useShellStore()
  const { theme } = useTheme()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tutorialTriggered = useRef(false)

  // Determine if we should show the simplified Basic (Chat) view
  // Only show Basic view if user is in BASIC mode AND on the main dashboard page
  const isDashboardRoot = pathname === "/dashboard"
  const isBasicView = viewMode === "BASIC" && isDashboardRoot

  // Verify tutorial trigger
  useEffect(() => {
    if (searchParams.get("tutorial") === "true" && !tutorialTriggered.current) {
      tutorialTriggered.current = true
      setViewMode("TUTORIAL")
      // Clear the ?tutorial=true from URL so it doesn't re-trigger
      router.replace(pathname, { scroll: false })
    }
  }, [searchParams, setViewMode, router, pathname])

  return (
    <div className="h-screen w-full bg-background relative flex flex-col overflow-hidden">
      {/* Tutorial Overlay always mounted, handles its own visibility */}
      <TutorialOverlay />

      {isBasicView ? (
        <div className="flex-1 flex items-center justify-center p-0 md:p-6 relative">

          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-violet-500/5 opacity-40 pointer-events-none" />

          {/* Mode Toggle Button - Floating Switch */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-3 px-4 py-2.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-full shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Chat</span>
            </div>
            <Switch
              id="mode-toggle"
              checked={false}
              onCheckedChange={() => setViewMode("ADVANCED")}
              className="data-[state=checked]:bg-emerald-600"
            />
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Advanced</span>
            </div>
          </div>

          {/* Main Chat Container - Large & Immersive */}
          <div className="z-10 w-full max-w-5xl h-[100dvh] md:h-[92dvh] shadow-2xl rounded-none md:rounded-3xl overflow-hidden border-0 md:border border-white/20 dark:border-white/10 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl relative flex flex-col">
            {/* ID for Spotlight */}
            <div id="assistant-pane" className="h-full w-full">
              {chatbot}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex h-full overflow-hidden">
          {/* Desktop Sidebar - Hidden on Mobile */}
          <Sidebar className="hidden md:flex shrink-0" />

          {/* Mobile Sidebar - Drawer */}
          <MobileSidebar />

          <ResizablePanelGroup direction="horizontal" className="flex-1 h-full">
            {/* Left Canvas - 75% for Desktop, handled by resizable panels */}
            <ResizablePanel defaultSize={75} minSize={30} id="main-canvas-panel">
              <div id="main-canvas" className="h-full w-full overflow-hidden relative bg-background">
                {children}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="hidden md:flex bg-border/50 hover:bg-emerald-500/50 transition-colors w-1" />

            {/* Right Chatbot - 25% (M-5 / A-1) */}
            <ResizablePanel
              defaultSize={25}
              minSize={20}
              maxSize={50}
              collapsible={true}
              collapsedSize={0}
              onCollapse={() => { }}
              id="assistant-panel"
              className="hidden md:block transition-all duration-300 ease-in-out pl-0"
            >
              {/* Mode Toggle Button - Above Chatbot - integrated into header or separate */}
              <div className="flex items-center justify-center gap-3 px-4 py-3 bg-background border-b border-border/50">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Chat</span>
                </div>
                <Switch
                  id="mode-toggle"
                  checked={viewMode === "ADVANCED"}
                  onCheckedChange={(checked) => setViewMode(checked ? "ADVANCED" : "BASIC")}
                  className="data-[state=checked]:bg-emerald-600"
                />
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Advanced</span>
                </div>
              </div>
              <div id="assistant-pane" className="h-[calc(100%-57px)] w-full border-l border-border/50 bg-background/50 backdrop-blur-sm">
                {chatbot}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}
    </div>
  )
}
