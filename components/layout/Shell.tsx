"use client"

import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import { useShellStore } from "@/lib/store"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import { TutorialOverlay } from "@/components/tutorial/tutorial-overlay"
import { Sidebar } from "@/components/core/sidebar"
import { MobileSidebar } from "@/components/layout/mobile-sidebar"
import { Switch } from "@/components/ui/switch"
import { Layers, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { ImperativePanelHandle } from "react-resizable-panels"

export function Shell({ children, chatbot }: { children: React.ReactNode; chatbot?: React.ReactNode }) {
  const { viewMode, setViewMode } = useShellStore()
  const { theme } = useTheme()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tutorialTriggered = useRef(false)
  const [mounted, setMounted] = useState(false)
  const chatbotPanelRef = useRef<ImperativePanelHandle>(null)
  const [chatbotExpanded, setChatbotExpanded] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Determine if we should show the simplified Basic (Chat) view
  // Only show Basic view if user is in BASIC mode AND on the main dashboard page
  const isDashboardRoot = pathname === "/dashboard"
  const isBasicView = mounted && viewMode === "BASIC" && isDashboardRoot

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

          <div className="absolute inset-0 ott-glow opacity-40 pointer-events-none" />

          {/* Mode Toggle Button - Floating Switch */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-3 px-4 py-2.5 bg-white/80 dark:bg-card/80 backdrop-blur-md border border-border rounded-full shadow-ott hover:shadow-ott-hover transition-all">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Chat</span>
            </div>
            <Switch
              id="mode-toggle"
              checked={false}
              onCheckedChange={() => setViewMode("ADVANCED")}
              className="data-[state=checked]:bg-primary"
            />
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Advanced</span>
            </div>
          </div>

          {/* Main Chat Container - Large & Immersive */}
          <div className="z-10 w-full max-w-5xl h-[100dvh] md:h-[92dvh] shadow-ott-elevated rounded-none md:rounded-[24px] overflow-hidden border-0 md:border border-border/60 bg-white/80 dark:bg-card/80 backdrop-blur-2xl relative flex flex-col">
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
              <div id="main-canvas" className="h-full w-full overflow-y-auto relative bg-background">
                {children}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="hidden md:flex bg-border/50 hover:bg-primary/50 transition-colors w-1" />

            {/* Right Chatbot - Collapsed by default; when expanded, minimum 15% width so formatting doesn't break */}
            <ResizablePanel
              ref={chatbotPanelRef}
              defaultSize={0}
              minSize={15}
              maxSize={50}
              collapsible={true}
              collapsedSize={0}
              onCollapse={() => setChatbotExpanded(false)}
              onExpand={() => setChatbotExpanded(true)}
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
                  className="data-[state=checked]:bg-primary"
                />
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Advanced</span>
                </div>
              </div>
              <div 
                id="assistant-pane" 
                className="h-[calc(100%-57px)] w-full border-l border-border/50 bg-background/50 backdrop-blur-sm"
                onClick={() => {
                  if (!chatbotExpanded) {
                    chatbotPanelRef.current?.expand()
                    setChatbotExpanded(true)
                  }
                }}
              >
                {chatbot}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>

          {/* Floating Chatbot Button - Show when collapsed */}
          {chatbot && !chatbotExpanded && (
            <Button
              onClick={() => {
                chatbotPanelRef.current?.expand()
                setChatbotExpanded(true)
              }}
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-primary hover:bg-primary/90 text-white"
              size="icon"
              title="Open chatbot (opens panel on the right; button hides when panel is open)"
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
